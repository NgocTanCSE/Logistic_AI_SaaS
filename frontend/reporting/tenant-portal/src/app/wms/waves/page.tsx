'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { data } from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import {
  EditorialPageHeader,
  EditorialSection,
  MetricBand,
  StatusLabel,
  EmptyNote,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { Button, DataState, Input, Modal, Select, TableState } from 'ui-components';
import type {
  AllocationStrategy,
  InventoryItem,
  Order,
  PickTask,
  Warehouse,
  Wave,
} from '@/lib/mock';
import {
  formatDateVN,
  formatDateTimeVN,
  formatNumber,
  orderStatusLabel,
  orderStatusTone,
  pickTaskStatusLabel,
  pickTaskStatusTone,
  waveStatusLabel,
  waveStatusTone,
} from '@/lib/labels';

const STRATEGY_META: Record<
  AllocationStrategy,
  { label: string; short: string; description: string }
> = {
  FIFO: {
    label: 'FIFO · Nhập trước xuất trước',
    short: 'FIFO',
    description: 'Ưu tiên lô cập nhật sớm nhất — giảm tồn lâu, phù hợp hàng không hạn dùng.',
  },
  LIFO: {
    label: 'LIFO · Nhập sau xuất trước',
    short: 'LIFO',
    description: 'Ưu tiên lô mới nhất — dùng cho hàng cần luân chuyển nhanh theo lô.',
  },
  FEFO: {
    label: 'FEFO · Hết hạn trước xuất trước',
    short: 'FEFO',
    description: 'Ưu tiên lô gần hạn nhất — bắt buộc với hàng có hạn sử dụng.',
  },
};

function sortInventory(items: InventoryItem[], strategy: AllocationStrategy): InventoryItem[] {
  const rows = [...items];
  if (strategy === 'FEFO') {
    return rows.sort((a, b) =>
      (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'),
    );
  }
  if (strategy === 'LIFO') {
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return rows.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export default function WavePickingPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [tasks, setTasks] = useState<PickTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [warehouseId, setWarehouseId] = useState('');
  const [strategy, setStrategy] = useState<AllocationStrategy>('FEFO');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  const [activeWaveId, setActiveWaveId] = useState<string>('');
  const [confirmTask, setConfirmTask] = useState<PickTask | null>(null);
  const [confirmQty, setConfirmQty] = useState('1');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseRows, orderRows, inventoryRows, waveRows, taskRows] = await Promise.all([
        data.warehouses.list(),
        data.orders.list(),
        data.inventory.list(),
        data.waves.list(),
        data.pickTasks.list(),
      ]);
      setWarehouses(warehouseRows);
      setOrders(orderRows);
      setInventory(inventoryRows);
      setWaves(waveRows);
      setTasks(taskRows);
      setWarehouseId((current) => current || warehouseRows[0]?.id || '');
      setActiveWaveId((current) => current || waveRows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu WMS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === warehouseId),
    [warehouses, warehouseId],
  );

  const allocatableOrders = useMemo(
    () =>
      [...orders]
        .filter(
          (order) =>
            order.warehouseId === warehouseId &&
            ['NEW', 'UNASSIGNED', 'PENDING_PICKUP'].includes(order.status),
        )
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [orders, warehouseId],
  );

  const pickable = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.warehouseId === warehouseId && item.available > 0,
      ),
    [inventory, warehouseId],
  );

  const strategyPreview = useMemo(
    () =>
      (['FIFO', 'LIFO', 'FEFO'] as AllocationStrategy[]).map((key) => ({
        key,
        rows: sortInventory(pickable, key).slice(0, 4),
      })),
    [pickable],
  );

  const waveTasks = useMemo(
    () => tasks.filter((task) => task.waveId === activeWaveId),
    [tasks, activeWaveId],
  );

  const activeWave = useMemo(
    () => waves.find((wave) => wave.id === activeWaveId) ?? null,
    [waves, activeWaveId],
  );

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const createWave = async () => {
    if (!selectedWarehouse) return;
    setCreating(true);
    setNotice('');
    try {
      const wave = await data.waves.allocate({
        warehouseId: selectedWarehouse.id,
        orderIds: selectedOrderIds,
        strategy,
        picker: user?.fullName || 'Bạn (demo)',
      });
      setNotice(
        `Đã tạo wave ${wave.code} theo ${strategy} với ${wave.taskCount} tác vụ soạn hàng.`,
      );
      setSelectedOrderIds([]);
      setActiveWaveId(wave.id);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tạo được wave.');
    } finally {
      setCreating(false);
    }
  };

  const submitConfirm = async () => {
    if (!confirmTask) return;
    setConfirming(true);
    try {
      await data.pickTasks.confirm(confirmTask.id, Number(confirmQty) || 0);
      setConfirmTask(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không xác nhận được tác vụ.');
    } finally {
      setConfirming(false);
    }
  };

  const metrics: EditorialMetric[] = [
    {
      label: 'Đơn chờ gom',
      value: String(allocatableOrders.length),
      meta: selectedWarehouse ? `Kho ${selectedWarehouse.code}` : undefined,
    },
    {
      label: 'Tồn khả dụng',
      value: String(pickable.length),
      meta: `${formatNumber(pickable.reduce((sum, item) => sum + item.available, 0))} đơn vị`,
    },
    {
      label: 'Wave đang mở',
      value: String(waves.filter((wave) => wave.status !== 'PICKED' && wave.status !== 'CANCELLED').length),
    },
    {
      label: 'Tác vụ chờ',
      value: String(tasks.filter((task) => task.status === 'PENDING').length),
      tone: tasks.some((task) => task.status === 'PENDING') ? 'warning' : 'success',
    },
  ];

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Ch. 10"
        title="Wave picking & cấp phát tồn kho"
        description="Gom đơn thành đợt soạn hàng theo ba chiến lược FIFO, LIFO, FEFO. Bảng so sánh cho thấy rõ bin và lô hàng mà từng chiến lược sẽ chọn."
      />

      <MetricBand metrics={metrics} />

      <EditorialSection title="Cấu hình wave" eyebrow="Bước 1">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <Select
              label="Kho"
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value);
                setSelectedOrderIds([]);
              }}
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.code} · ${warehouse.name}`,
              }))}
            />
            <Select
              label="Chiến lược cấp phát"
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as AllocationStrategy)}
              options={(['FIFO', 'LIFO', 'FEFO'] as AllocationStrategy[]).map((key) => ({
                value: key,
                label: STRATEGY_META[key].label,
              }))}
            />
            <p className="text-[11px] leading-relaxed text-ink-faint">
              {STRATEGY_META[strategy].description}
            </p>
            <Button
              onClick={createWave}
              isLoading={creating}
              disabled={selectedOrderIds.length === 0}
              size="sm"
            >
              Tạo wave ({selectedOrderIds.length} đơn)
            </Button>
            {notice ? (
              <p className="border-l-2 border-accent pl-2 text-[11px] text-ink">{notice}</p>
            ) : null}
          </div>

          <div className="border border-line">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Đơn có thể gom wave
              </span>
              <button
                type="button"
                className="text-[11px] font-semibold text-ink-soft hover:text-accent"
                onClick={() =>
                  setSelectedOrderIds(
                    selectedOrderIds.length === allocatableOrders.length
                      ? []
                      : allocatableOrders.map((order) => order.id),
                  )
                }
              >
                {selectedOrderIds.length === allocatableOrders.length ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
            </div>
            <div className="max-h-64 overflow-auto">
              {allocatableOrders.length === 0 ? (
                <div className="p-4">
                  <EmptyNote>Kho này không còn đơn chờ gom wave.</EmptyNote>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surface-alt">
                    <tr>
                      {['', 'Mã đơn', 'Khách', 'Trạng thái', 'Số món', 'COD'].map((label) => (
                        <th
                          key={label}
                          className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[12px]">
                    {allocatableOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-surface-alt"
                        onClick={() => toggleOrder(order.id)}
                      >
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => toggleOrder(order.id)}
                            aria-label={`Chọn đơn ${order.trackingCode}`}
                          />
                        </td>
                        <td className="px-3 py-1.5 font-mono">{order.trackingCode}</td>
                        <td className="px-3 py-1.5">{order.clientName}</td>
                        <td className="px-3 py-1.5">
                          <StatusLabel tone={orderStatusTone(order.status)}>
                            {orderStatusLabel(order.status)}
                          </StatusLabel>
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{order.itemCount}</td>
                        <td className="px-3 py-1.5 tabular-nums">
                          {formatNumber(order.codAmount)} ₫
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </EditorialSection>

      <EditorialSection
        title="So sánh ba chiến lược"
        eyebrow="Bước 2 · Xem trước phân bổ"
        action={
          <span className="text-[11px] text-ink-faint">
            Cùng một lô tồn kho, ba chiến lược chọn bin/lô khác nhau
          </span>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {strategyPreview.map(({ key, rows }) => (
            <div key={key} className="border border-line">
              <div className="border-b border-line bg-surface-alt px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
                    {STRATEGY_META[key].short}
                  </span>
                  {key === strategy ? <StatusLabel tone="success">Đang chọn</StatusLabel> : null}
                </div>
              </div>
              {rows.length === 0 ? (
                <div className="p-3">
                  <EmptyNote>Không có tồn khả dụng.</EmptyNote>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      {['SKU', 'Bin', 'SL', 'Hạn'].map((label) => (
                        <th
                          key={label}
                          className="px-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[11px]">
                    {rows.map((item, index) => (
                      <tr key={item.id} className={index === 0 ? 'bg-accent-soft/40' : ''}>
                        <td className="px-2 py-1.5 font-mono">{item.sku}</td>
                        <td className="px-2 py-1.5">{item.binCode}</td>
                        <td className="px-2 py-1.5 tabular-nums">{item.available}</td>
                        <td className="px-2 py-1.5 tabular-nums text-ink-faint">
                          {item.expiryDate ? formatDateVN(item.expiryDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-ink-faint">
                {STRATEGY_META[key].description}
              </p>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection title="Wave đã tạo" eyebrow="Bước 3">
        <DataState loading={loading} empty={!loading && waves.length === 0} error={error} onRetry={load}>
          <div className="overflow-hidden border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {['Mã wave', 'Kho', 'Chiến lược', 'Đơn', 'Tác vụ', 'Trạng thái', 'Tạo lúc', ''].map(
                    (label, index) => (
                      <th
                        key={`${label}-${index}`}
                        className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                <TableState
                  loading={loading}
                  empty={!loading && waves.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={8}
                  emptyTitle="Chưa có wave"
                  emptyDescription="Chọn đơn và tạo wave ở bước 1."
                >
                  {waves.map((wave) => (
                    <tr
                      key={wave.id}
                      className={wave.id === activeWaveId ? 'bg-accent-soft/40' : 'hover:bg-surface-alt'}
                    >
                      <td className="px-3 py-2 font-mono">{wave.code}</td>
                      <td className="px-3 py-2">{wave.warehouseCode}</td>
                      <td className="px-3 py-2">{wave.strategy}</td>
                      <td className="px-3 py-2 tabular-nums">{wave.orderCount}</td>
                      <td className="px-3 py-2 tabular-nums">{wave.taskCount}</td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={waveStatusTone(wave.status)}>
                          {waveStatusLabel(wave.status)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {formatDateTimeVN(wave.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-ink-soft hover:text-accent"
                          onClick={() => setActiveWaveId(wave.id)}
                        >
                          Xem tác vụ
                        </button>
                      </td>
                    </tr>
                  ))}
                </TableState>
              </tbody>
            </table>
          </div>
        </DataState>
      </EditorialSection>

      <EditorialSection
        title="Tác vụ soạn hàng"
        eyebrow={activeWave ? `Wave ${activeWave.code}` : 'Chọn wave'}
        action={
          activeWave ? (
            <StatusLabel tone={waveStatusTone(activeWave.status)}>
              {waveStatusLabel(activeWave.status)}
            </StatusLabel>
          ) : null
        }
      >
        {!activeWave ? (
          <EmptyNote>Chọn một wave ở bảng trên để xem tác vụ.</EmptyNote>
        ) : (
          <div className="overflow-hidden border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {['Thứ tự', 'Đơn', 'SKU', 'Bin', 'SL cần', 'Đã soạn', 'Trạng thái', ''].map(
                    (label, index) => (
                      <th
                        key={`${label}-${index}`}
                        className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-[12px]">
                {waveTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-[12px] text-ink-faint">
                      Wave này chưa có tác vụ.
                    </td>
                  </tr>
                ) : (
                  waveTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2 tabular-nums">{task.sequence}</td>
                      <td className="px-3 py-2 font-mono">{task.orderTrackingCode}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{task.sku}</div>
                        <div className="text-[11px] text-ink-faint">{task.productName}</div>
                      </td>
                      <td className="px-3 py-2 font-mono">{task.binCode}</td>
                      <td className="px-3 py-2 tabular-nums">{task.quantity}</td>
                      <td className="px-3 py-2 tabular-nums">{task.pickedQuantity}</td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={pickTaskStatusTone(task.status)}>
                          {pickTaskStatusLabel(task.status)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2">
                        {task.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-ink-soft hover:text-accent"
                            onClick={() => {
                              setConfirmTask(task);
                              setConfirmQty(String(task.quantity));
                            }}
                          >
                            Xác nhận
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </EditorialSection>

      <Modal
        isOpen={confirmTask !== null}
        onClose={() => setConfirmTask(null)}
        title="Xác nhận soạn hàng"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmTask(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={submitConfirm} isLoading={confirming}>
              Xác nhận
            </Button>
          </div>
        }
      >
        {confirmTask ? (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-soft">
              Tác vụ lấy <strong className="text-ink">{confirmTask.productName}</strong> tại bin{' '}
              <span className="font-mono">{confirmTask.binCode}</span>. Cần soạn{' '}
              {confirmTask.quantity}, số lượng nhỏ hơn sẽ ghi nhận thiếu hàng (SHORT).
            </p>
            <Input
              label="Số lượng đã soạn"
              type="number"
              min={1}
              max={confirmTask.quantity}
              value={confirmQty}
              onChange={(event) => setConfirmQty(event.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
