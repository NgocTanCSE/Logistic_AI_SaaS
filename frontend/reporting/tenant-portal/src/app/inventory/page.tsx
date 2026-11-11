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
import type { InventoryItem, MovementType, Product, StockMovement, Warehouse } from '@/lib/mock';
import {
  formatCurrency,
  formatDateVN,
  formatDateTimeVN,
  formatNumber,
  movementTypeLabel,
} from '@/lib/labels';

const MOVEMENT_TYPES: MovementType[] = [
  'RECEIVE',
  'PUTAWAY',
  'PICK',
  'TRANSFER',
  'ADJUST',
  'CYCLE_COUNT',
  'RETURN',
  'SHIP',
];

const MOVEMENT_TONE: Record<MovementType, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  RECEIVE: 'success',
  PUTAWAY: 'info',
  PICK: 'neutral',
  TRANSFER: 'info',
  ADJUST: 'warning',
  CYCLE_COUNT: 'info',
  RETURN: 'warning',
  SHIP: 'neutral',
};

const STOCK_PAGE_SIZE = 15;
const MOVEMENT_PAGE_SIZE = 10;

function daysToExpiry(value: string | null) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (24 * 3600_000));
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'EXPIRING'>('ALL');
  const [movementFilter, setMovementFilter] = useState<MovementType | 'ALL'>('ALL');
  const [stockPage, setStockPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    sku: '',
    warehouseCode: '',
    binCode: '',
    quantity: '10',
    lotNo: '',
    expiryDate: '',
  });
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustVersion, setAdjustVersion] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [receiveError, setReceiveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [itemRows, productRows, warehouseRows, movementRows] = await Promise.all([
        data.inventory.list(),
        data.products.list(),
        data.warehouses.list(),
        data.movements.list(),
      ]);
      setItems(itemRows);
      setProducts(productRows);
      setWarehouses(warehouseRows);
      setMovements(movementRows);
      setReceiveForm((current) => ({
        ...current,
        sku: current.sku || productRows[0]?.sku || '',
        warehouseCode: current.warehouseCode || warehouseRows[0]?.code || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu tồn kho.');
      setItems([]);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productBySku = useMemo(
    () => new Map(products.map((product) => [product.sku, product])),
    [products],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => warehouseFilter === 'ALL' || item.warehouseId === warehouseFilter)
      .filter((item) => {
        if (!term) return true;
        return (
          item.sku.toLowerCase().includes(term) ||
          item.productName.toLowerCase().includes(term) ||
          item.binCode.toLowerCase().includes(term) ||
          item.lotNo.toLowerCase().includes(term)
        );
      })
      .filter((item) => {
        if (riskFilter === 'ALL') return true;
        const product = productBySku.get(item.sku);
        if (riskFilter === 'LOW') {
          return product ? item.available <= product.reorderPoint : false;
        }
        const days = daysToExpiry(item.expiryDate);
        return days !== null && days <= 30;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [items, warehouseFilter, search, riskFilter, productBySku]);

  const filteredMovements = useMemo(
    () =>
      movements
        .filter((row) => movementFilter === 'ALL' || row.type === movementFilter)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [movements, movementFilter],
  );

  const stockTotalPages = Math.max(1, Math.ceil(filtered.length / STOCK_PAGE_SIZE));
  const stockCurrentPage = Math.min(stockPage, stockTotalPages);
  const pagedItems = filtered.slice(
    (stockCurrentPage - 1) * STOCK_PAGE_SIZE,
    stockCurrentPage * STOCK_PAGE_SIZE,
  );

  const movementTotalPages = Math.max(1, Math.ceil(filteredMovements.length / MOVEMENT_PAGE_SIZE));
  const movementCurrentPage = Math.min(movementPage, movementTotalPages);
  const pagedMovements = filteredMovements.slice(
    (movementCurrentPage - 1) * MOVEMENT_PAGE_SIZE,
    movementCurrentPage * MOVEMENT_PAGE_SIZE,
  );

  useEffect(() => {
    setStockPage(1);
  }, [warehouseFilter, search, riskFilter]);

  useEffect(() => {
    setMovementPage(1);
  }, [movementFilter]);

  const stockValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = productBySku.get(item.sku);
        return sum + (product ? product.unitPrice * item.quantity : 0);
      }, 0),
    [items, productBySku],
  );

  const lowStock = useMemo(
    () =>
      items.filter((item) => {
        const product = productBySku.get(item.sku);
        return product ? item.available <= product.reorderPoint : false;
      }).length,
    [items, productBySku],
  );

  const expiring = useMemo(
    () =>
      items.filter((item) => {
        const days = daysToExpiry(item.expiryDate);
        return days !== null && days <= 30;
      }).length,
    [items],
  );

  const metrics: EditorialMetric[] = [
    {
      label: 'Mã hàng lưu kho',
      value: formatNumber(items.length),
      meta: `${formatNumber(new Set(items.map((item) => item.sku)).size)} SKU`,
    },
    {
      label: 'Tổng đơn vị',
      value: formatNumber(items.reduce((sum, item) => sum + item.quantity, 0)),
      meta: `Khả dụng ${formatNumber(items.reduce((sum, item) => sum + item.available, 0))}`,
    },
    {
      label: 'Giá trị tồn',
      value: formatCurrency(stockValue),
      meta: 'Theo đơn giá sản phẩm',
    },
    {
      label: 'Rủi ro',
      value: `${lowStock} / ${expiring}`,
      meta: 'Dưới định mức / cận hạn 30 ngày',
      tone: lowStock + expiring > 0 ? 'warning' : 'success',
    },
  ];

  const receiveQuantity = Number(receiveForm.quantity);
  const receiveValid =
    receiveForm.sku !== '' &&
    receiveForm.warehouseCode !== '' &&
    receiveForm.binCode.trim() !== '' &&
    Number.isInteger(receiveQuantity) &&
    receiveQuantity > 0;

  const adjustQuantity = Number(adjustQty);
  const adjustQuantityValid =
    adjustQty.trim() !== '' && Number.isInteger(adjustQuantity) && adjustQuantity !== 0;
  const adjustResultQuantity = adjustTarget
    ? adjustTarget.quantity + (Number.isFinite(adjustQuantity) ? adjustQuantity : 0)
    : 0;
  const adjustWouldGoNegative =
    adjustTarget !== null && adjustQuantityValid && adjustResultQuantity < 0;

  const submitReceive = async () => {
    setReceiveError('');
    setNotice('');
    if (!receiveForm.sku || !receiveForm.warehouseCode) {
      setReceiveError('Chọn SKU và kho trước khi nhập hàng.');
      return;
    }
    const binCode = receiveForm.binCode.trim().toUpperCase();
    if (!binCode) {
      setReceiveError('Nhập mã bin nhận hàng.');
      return;
    }
    if (!Number.isInteger(receiveQuantity) || receiveQuantity <= 0) {
      setReceiveError('Số lượng nhập phải là số nguyên lớn hơn 0.');
      return;
    }
    if (receiveForm.expiryDate) {
      const expiry = new Date(receiveForm.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiry.getTime()) || expiry.getTime() < today.getTime()) {
        setReceiveError('Hạn dùng phải là ngày hợp lệ, không nằm trong quá khứ.');
        return;
      }
    }

    setBusy(true);
    try {
      const result = await data.inventory.receive({
        sku: receiveForm.sku,
        warehouseCode: receiveForm.warehouseCode,
        binCode,
        quantity: receiveQuantity,
        lotNo: receiveForm.lotNo.trim() || undefined,
        expiryDate: receiveForm.expiryDate || null,
      });
      setNotice(
        `Đã nhập ${formatNumber(receiveQuantity)} đơn vị ${result.sku} vào bin ${result.binCode}.`,
      );
      setReceiveOpen(false);
      setReceiveForm((current) => ({
        ...current,
        quantity: '10',
        lotNo: '',
        expiryDate: '',
        binCode: '',
      }));
      await load();
    } catch (err) {
      setReceiveError(err instanceof Error ? err.message : 'Không nhập được hàng.');
    } finally {
      setBusy(false);
    }
  };

  const submitAdjust = async () => {
    if (!adjustTarget) return;
    setAdjustError('');
    setNotice('');
    if (!adjustQuantityValid) {
      setAdjustError('Số lượng điều chỉnh phải là số nguyên khác 0.');
      return;
    }
    if (adjustResultQuantity < 0) {
      setAdjustError(
        `Không thể ghi: tồn sau điều chỉnh sẽ âm (${formatNumber(adjustResultQuantity)}).`,
      );
      return;
    }

    setBusy(true);
    try {
      // Optimistic locking: đọc lại bản ghi trước khi ghi, từ chối nếu version đã đổi.
      const latest = await data.inventory.get(adjustTarget.id);
      if (!latest) {
        setAdjustError('Dòng tồn kho không còn tồn tại. Tải lại danh sách để tiếp tục.');
        await load();
        return;
      }
      if (adjustVersion !== null && latest.version !== adjustVersion) {
        setAdjustError(
          `Xung đột phiên bản (409): bản ghi đã chuyển từ v${adjustVersion} sang v${latest.version}. ` +
            'Dữ liệu vừa được tải lại, kiểm tra số tồn mới rồi ghi lại.',
        );
        setAdjustTarget(latest);
        setAdjustVersion(latest.version);
        await load();
        return;
      }
      if (latest.quantity + adjustQuantity < 0) {
        setAdjustError(
          `Không thể ghi: tồn hiện tại ${formatNumber(latest.quantity)} không đủ để trừ ${formatNumber(
            Math.abs(adjustQuantity),
          )}.`,
        );
        setAdjustTarget(latest);
        setAdjustVersion(latest.version);
        return;
      }

      await data.inventory.adjust({
        inventoryId: latest.id,
        quantity: adjustQuantity,
        reason: adjustReason.trim() || 'Điều chỉnh theo kiểm kê',
      });
      setNotice(
        `Đã điều chỉnh ${latest.sku} tại bin ${latest.binCode} (${adjustQuantity > 0 ? '+' : ''}${formatNumber(adjustQuantity)}).`,
      );
      setAdjustTarget(null);
      setAdjustVersion(null);
      setAdjustQty('');
      setAdjustReason('');
      await load();
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : 'Không điều chỉnh được tồn kho.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Tồn kho"
        title="Tồn kho & sổ phát sinh"
        description="Tồn kho theo từng bin và lô, kèm sổ phát sinh ghi lại mọi lần nhập, soạn, chuyển và điều chỉnh. Số dư sau mỗi bút toán khớp với tồn hiện tại."
        meta={`${filtered.length} dòng tồn`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/inventory/putaway"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Cất hàng thông minh
            </Link>
            <Button variant="outline" size="sm" onClick={() => setReceiveOpen(true)}>
              Nhập kho
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
        title="Tồn theo bin"
        eyebrow="Bảng tồn kho"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <Select
                className="h-8"
                aria-label="Lọc theo kho"
                value={warehouseFilter}
                onChange={(event) => setWarehouseFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'Mọi kho' },
                  ...warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: `${warehouse.code} · ${warehouse.name}`,
                  })),
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="search"
            placeholder="Tìm SKU, tên hàng, bin, lô"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-72"
          />
          <div className="w-52">
            <Select
              className="h-9"
              aria-label="Lọc theo rủi ro tồn kho"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value as 'ALL' | 'LOW' | 'EXPIRING')
              }
              options={[
                { value: 'ALL', label: 'Mọi mức tồn' },
                { value: 'LOW', label: 'Dưới định mức' },
                { value: 'EXPIRING', label: 'Cận hạn 30 ngày' },
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {[
                  'SKU',
                  'Sản phẩm',
                  'Kho',
                  'Bin',
                  'Lô',
                  'Hạn dùng',
                  'Tồn',
                  'Giữ',
                  'Khả dụng',
                  'Phiên bản',
                  'Cập nhật',
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
                colSpan={12}
                emptyTitle="Không có dòng tồn kho"
                emptyDescription="Thử đổi kho hoặc bộ lọc rủi ro."
              >
                {filtered.map((item) => {
                  const product = productBySku.get(item.sku);
                  const days = daysToExpiry(item.expiryDate);
                  const isLow = product ? item.available <= product.reorderPoint : false;
                  return (
                    <tr key={item.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2 font-mono text-[11px] font-medium text-ink">
                        {item.sku}
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{item.productName}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {item.warehouseCode}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {item.binCode}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">
                        {item.lotNo}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {item.expiryDate ? (
                          <span className="inline-flex items-center gap-2">
                            {formatDateVN(item.expiryDate)}
                            {days !== null && days <= 30 ? (
                              <StatusLabel tone={days < 0 ? 'danger' : 'warning'}>
                                {days < 0 ? 'Quá hạn' : `${days} ngày`}
                              </StatusLabel>
                            ) : null}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-medium text-ink">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {formatNumber(item.reserved)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        <span className={isLow ? 'font-semibold text-warning' : 'text-ink'}>
                          {formatNumber(item.available)}
                        </span>
                        {isLow ? (
                          <div className="text-[10px] text-ink-faint">
                            Định mức {formatNumber(product?.reorderPoint ?? 0)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">
                        v{item.version}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-faint">
                        {formatDateTimeVN(item.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-ink-soft hover:text-accent"
                          onClick={() => {
                            setAdjustTarget(item);
                            setAdjustVersion(item.version);
                            setAdjustQty('-1');
                            setAdjustReason('');
                          }}
                        >
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </TableState>
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection
        title="Sổ phát sinh kho"
        eyebrow="Inventory ledger"
        action={
          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc loại phát sinh"
                value={movementFilter}
                onChange={(event) =>
                  setMovementFilter(event.target.value as MovementType | 'ALL')
                }
                options={[
                  { value: 'ALL', label: 'Mọi loại' },
                  ...MOVEMENT_TYPES.map((type) => ({
                    value: type,
                    label: movementTypeLabel(type),
                  })),
                ]}
              />
            </div>
          </div>
        }
      >
        <DataState
          loading={loading}
          empty={!loading && filteredMovements.length === 0}
          error={error ? new Error(error) : undefined}
          onRetry={load}
          emptyTitle="Chưa có bút toán"
          emptyDescription="Mọi thao tác nhập, soạn, chuyển, điều chỉnh đều ghi vào sổ này."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {['Thời điểm', 'Loại', 'SKU', 'Kho / Bin', 'Số lượng', 'Số dư', 'Chứng từ', 'Người thực hiện'].map(
                    (label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                {filteredMovements.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-soft">
                      {formatDateTimeVN(row.at)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={MOVEMENT_TONE[row.type]}>
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
                      className={`px-3 py-2 tabular-nums font-medium ${
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </EditorialSection>

      <Modal
        isOpen={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        title="Nhập kho"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setReceiveOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitReceive} isLoading={busy}>
              Nhập kho
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="SKU"
            value={receiveForm.sku}
            onChange={(event) =>
              setReceiveForm((current) => ({ ...current, sku: event.target.value }))
            }
            options={products.map((product) => ({
              value: product.sku,
              label: `${product.sku} · ${product.name}`,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kho"
              value={receiveForm.warehouseCode}
              onChange={(event) =>
                setReceiveForm((current) => ({
                  ...current,
                  warehouseCode: event.target.value,
                }))
              }
              options={warehouses.map((warehouse) => ({
                value: warehouse.code,
                label: `${warehouse.code} · ${warehouse.name}`,
              }))}
            />
            <Input
              label="Bin"
              value={receiveForm.binCode}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, binCode: event.target.value }))
              }
              placeholder="A-01-02"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Số lượng"
              type="number"
              min={1}
              value={receiveForm.quantity}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, quantity: event.target.value }))
              }
            />
            <Input
              label="Số lô"
              value={receiveForm.lotNo}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, lotNo: event.target.value }))
              }
              placeholder="Tự sinh nếu trống"
            />
            <Input
              label="Hạn dùng"
              type="date"
              value={receiveForm.expiryDate}
              onChange={(event) =>
                setReceiveForm((current) => ({ ...current, expiryDate: event.target.value }))
              }
            />
          </div>
          <EmptyNote>
            Bin chưa có tồn sẽ được tạo mới với số lô và hạn dùng vừa nhập. Hạn dùng quyết định thứ
            tự FEFO ở wave picking.
          </EmptyNote>
        </div>
      </Modal>

      <Modal
        isOpen={adjustTarget !== null}
        onClose={() => setAdjustTarget(null)}
        title="Điều chỉnh tồn kho"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustTarget(null)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitAdjust} isLoading={busy}>
              Lưu điều chỉnh
            </Button>
          </div>
        }
      >
        {adjustTarget ? (
          <div className="space-y-3">
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="flex justify-between">
                <span>SKU</span>
                <span className="font-mono text-ink">{adjustTarget.sku}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Bin</span>
                <span className="font-mono text-ink">{adjustTarget.binCode}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Tồn hiện tại</span>
                <span className="tabular-nums text-ink">{formatNumber(adjustTarget.quantity)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Phiên bản</span>
                <span className="font-mono text-ink">v{adjustTarget.version}</span>
              </div>
            </div>
            <Input
              label="Số lượng điều chỉnh (âm để giảm)"
              type="number"
              value={adjustQty}
              onChange={(event) => setAdjustQty(event.target.value)}
            />
            <Input
              label="Lý do"
              value={adjustReason}
              onChange={(event) => setAdjustReason(event.target.value)}
              placeholder="Hàng hỏng, lệch kiểm kê, hết hạn..."
            />
            <p className="text-[11px] text-ink-faint">
              Backend tăng <span className="font-mono">version</span> sau mỗi lần ghi và từ chối
              nếu số lượng sau điều chỉnh âm.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
