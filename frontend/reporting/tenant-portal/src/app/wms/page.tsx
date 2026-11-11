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
import { DataState, Select } from 'ui-components';
import type {
  Bin,
  Equipment,
  InventoryItem,
  Order,
  PackSession,
  PickTask,
  Warehouse,
  Wave,
} from '@/lib/mock';
import {
  equipmentStatusLabel,
  equipmentStatusTone,
  formatDateTimeVN,
  formatNumber,
  warehouseStatusLabel,
  warehouseStatusTone,
  waveStatusLabel,
  waveStatusTone,
} from '@/lib/labels';
import { CapacityBar } from '@/components/demo/MiniCharts';

const PACK_STATUS_LABEL: Record<PackSession['status'], string> = {
  OPEN: 'Đang đóng',
  SEALED: 'Đã đóng kiện',
  VOID: 'Đã huỷ',
};

const PACK_STATUS_TONE: Record<PackSession['status'], 'info' | 'success' | 'neutral'> = {
  OPEN: 'info',
  SEALED: 'success',
  VOID: 'neutral',
};

export default function WmsOverviewPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [tasks, setTasks] = useState<PickTask[]>([]);
  const [sessions, setSessions] = useState<PackSession[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [warehouseRows, binRows, inventoryRows, waveRows, taskRows, sessionRows, equipmentRows] =
        await Promise.all([
          data.warehouses.list(),
          data.bins.list(),
          data.inventory.list(),
          data.waves.list(),
          data.pickTasks.list(),
          data.packSessions.list(),
          data.equipment.list(),
        ]);
      setWarehouses(warehouseRows);
      setBins(binRows);
      setInventory(inventoryRows);
      setWaves(waveRows);
      setTasks(taskRows);
      setSessions(sessionRows);
      setEquipment(equipmentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu kho.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleWarehouses = useMemo(
    () =>
      warehouseFilter === 'ALL'
        ? warehouses
        : warehouses.filter((row) => row.id === warehouseFilter),
    [warehouses, warehouseFilter],
  );

  const visibleCodes = useMemo(
    () => new Set(visibleWarehouses.map((row) => row.code)),
    [visibleWarehouses],
  );

  const visibleBins = useMemo(() => {
    if (visibleWarehouses.length === 0) return bins;
    const ids = new Set(visibleWarehouses.map((row) => row.id));
    return bins.filter((bin) => ids.has(bin.warehouseId));
  }, [bins, visibleWarehouses]);

  const visibleInventory = useMemo(
    () => inventory.filter((item) => visibleCodes.size === 0 || visibleCodes.has(item.warehouseCode)),
    [inventory, visibleCodes],
  );

  const openWaves = waves.filter((wave) => !['PICKED', 'CANCELLED'].includes(wave.status));
  const pendingTasks = tasks.filter((task) => task.status === 'PENDING');
  const openSessions = sessions.filter((session) => session.status === 'OPEN');

  const topBins = useMemo(
    () =>
      [...visibleBins]
        .map((bin) => ({
          bin,
          ratio: bin.maxVolumeCbm <= 0 ? 0 : bin.usedVolumeCbm / bin.maxVolumeCbm,
        }))
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 8),
    [visibleBins],
  );

  const metrics: EditorialMetric[] = [
    {
      label: 'Kho vận hành',
      value: formatNumber(warehouses.filter((row) => row.status === 'ACTIVE').length),
      meta: `${warehouses.length} kho trong tenant`,
    },
    {
      label: 'Đơn vị tồn',
      value: formatNumber(visibleInventory.reduce((sum, item) => sum + item.quantity, 0)),
      meta: `Khả dụng ${formatNumber(visibleInventory.reduce((sum, item) => sum + item.available, 0))}`,
    },
    {
      label: 'Wave đang mở',
      value: formatNumber(openWaves.length),
      meta: `${pendingTasks.length} tác vụ chờ soạn`,
      tone: pendingTasks.length > 0 ? 'warning' : 'success',
    },
    {
      label: 'Phiên đóng gói',
      value: formatNumber(openSessions.length),
      meta: `${sessions.filter((row) => row.status === 'SEALED').length} đã đóng kiện`,
    },
  ];

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Ch. 10"
        title="Trung tâm kho"
        description="Tổng hợp công suất kho, dòng chảy đơn hàng qua wave picking, tác vụ soạn hàng và trạm đóng gói. Mỗi ô số liệu mở thẳng màn hình xử lý tương ứng."
        meta={`${visibleWarehouses.length} kho · ${formatNumber(visibleBins.length)} bin`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-52">
              <Select
                className="h-8"
                aria-label="Lọc theo kho"
                value={warehouseFilter}
                onChange={(event) => setWarehouseFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'Tất cả kho' },
                  ...warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: `${warehouse.code} · ${warehouse.name}`,
                  })),
                ]}
              />
            </div>
            <Link
              href="/wms/waves"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Wave picking
            </Link>
          </div>
        }
      />

      <MetricBand metrics={metrics} />

      <DataState
        loading={loading}
        empty={!loading && warehouses.length === 0}
        error={error}
        onRetry={load}
        emptyTitle="Chưa có kho"
        emptyDescription="Thêm kho trước khi vận hành WMS."
      >
        <EditorialSection title="Dòng chảy vận hành" eyebrow="Pipeline">
          <div className="grid gap-px border border-line bg-line md:grid-cols-4">
            {[
              {
                label: 'Đơn chờ gom wave',
                value: visibleInventory.length,
                hint: 'Tồn khả dụng để cấp phát',
                href: '/orders',
                tone: 'info' as const,
              },
              {
                label: 'Wave đang mở',
                value: openWaves.length,
                hint: 'Đã cấp phát, chờ soạn',
                href: '/wms/waves',
                tone: openWaves.length > 0 ? ('warning' as const) : ('success' as const),
              },
              {
                label: 'Tác vụ chờ',
                value: pendingTasks.length,
                hint: 'Pick task chưa xác nhận',
                href: '/wms/tasks',
                tone: pendingTasks.length > 0 ? ('warning' as const) : ('success' as const),
              },
              {
                label: 'Phiên đóng gói mở',
                value: openSessions.length,
                hint: 'Chờ quét SKU và seal',
                href: '/wms/packing',
                tone: 'info' as const,
              },
            ].map((stage) => (
              <Link
                key={stage.label}
                href={stage.href}
                className="group bg-canvas px-3 py-3 transition-colors hover:bg-surface-alt"
              >
                <StatusLabel tone={stage.tone}>{stage.label}</StatusLabel>
                <div className="mt-2 font-editorial text-3xl leading-none text-ink tabular-nums">
                  {formatNumber(stage.value)}
                </div>
                <div className="mt-1 text-[11px] text-ink-faint">{stage.hint}</div>
                <div className="mt-2 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Mở xử lý →
                </div>
              </Link>
            ))}
          </div>
        </EditorialSection>

        <EditorialSection title="Công suất kho" eyebrow="Thể tích sử dụng">
          {visibleWarehouses.length === 0 ? (
            <EmptyNote>Không có kho trong bộ lọc này.</EmptyNote>
          ) : (
            <div className="divide-y divide-line border-y border-line">
              {visibleWarehouses.map((warehouse) => {
                const ratio =
                  warehouse.capacityCbm <= 0 ? 0 : warehouse.usedCbm / warehouse.capacityCbm;
                return (
                  <div key={warehouse.id} className="grid gap-3 py-3 md:grid-cols-[220px_1fr_140px] md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-ink">
                          {warehouse.code}
                        </span>
                        <StatusLabel tone={warehouseStatusTone(warehouse.status)}>
                          {warehouseStatusLabel(warehouse.status)}
                        </StatusLabel>
                      </div>
                      <div className="text-[12px] text-ink-soft">{warehouse.name}</div>
                      <div className="text-[11px] text-ink-faint">
                        {warehouse.province} · {warehouse.binCount} bin
                      </div>
                    </div>
                    <CapacityBar
                      used={warehouse.usedCbm}
                      total={warehouse.capacityCbm}
                      label={`${Math.round(ratio * 100)}% thể tích`}
                      unit="m³"
                      tone={ratio > 0.9 ? 'danger' : ratio > 0.75 ? 'warning' : 'success'}
                    />
                    <div className="text-[11px] text-ink-faint md:text-right">
                      <div>Quản lý: {warehouse.manager}</div>
                      <div className="tabular-nums">
                        {formatNumber(warehouse.binCount)} bin · {formatNumber(warehouse.capacityCbm)} m³
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </EditorialSection>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <EditorialSection title="Bin đầy nhất" eyebrow="Ưu tiên cất hàng">
            <div className="overflow-x-auto border border-line">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface-alt">
                  <tr>
                    {['Bin', 'Khu', 'Tải trọng', 'Thể tích', 'Lấp đầy'].map((label) => (
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
                  {topBins.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-ink-faint">
                        Chưa có dữ liệu bin.
                      </td>
                    </tr>
                  ) : (
                    topBins.map(({ bin, ratio }) => (
                      <tr key={bin.id}>
                        <td className="px-3 py-2 font-mono text-[11px] text-ink">{bin.code}</td>
                        <td className="px-3 py-2 text-ink-soft">{bin.zone}</td>
                        <td className="px-3 py-2 tabular-nums text-ink-soft">
                          {formatNumber(bin.usedWeightKg)}/{formatNumber(bin.maxWeightKg)} kg
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ink-soft">
                          {formatNumber(bin.usedVolumeCbm)}/{formatNumber(bin.maxVolumeCbm)} m³
                        </td>
                        <td className="w-40 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-alt">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, ratio * 100)}%`,
                                  background:
                                    ratio > 0.9 ? '#a3483f' : ratio > 0.75 ? '#8a5d28' : '#3f6b4f',
                                }}
                              />
                            </div>
                            <span className="tabular-nums text-[11px] text-ink-soft">
                              {Math.round(ratio * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </EditorialSection>

          <div className="space-y-6">
            <EditorialSection title="Thiết bị" eyebrow="Trạng thái">
              <div className="space-y-2 text-[12px]">
                {(['ONLINE', 'OFFLINE', 'MAINTENANCE'] as Equipment['status'][]).map((status) => {
                  const rows = equipment.filter((row) => row.status === status);
                  return (
                    <div key={status} className="flex items-center justify-between border-b border-line pb-1.5">
                      <StatusLabel tone={equipmentStatusTone(status)}>
                        {equipmentStatusLabel(status)}
                      </StatusLabel>
                      <span className="tabular-nums text-ink">{rows.length}</span>
                    </div>
                  );
                })}
                {equipment.filter((row) => (row.batteryPct ?? 100) < 20).length > 0 ? (
                  <EmptyNote>
                    {equipment.filter((row) => (row.batteryPct ?? 100) < 20).length} thiết bị pin
                    dưới 20%, cần sạc trước ca.
                  </EmptyNote>
                ) : (
                  <EmptyNote>Không có thiết bị pin yếu.</EmptyNote>
                )}
                <div className="pt-1 text-right">
                  <Link
                    href="/wms/equipment"
                    className="text-[11px] font-semibold text-accent hover:underline"
                  >
                    Quản lý thiết bị
                  </Link>
                </div>
              </div>
            </EditorialSection>

            <EditorialSection title="Wave gần nhất" eyebrow="Cấp phát">
              {waves.length === 0 ? (
                <EmptyNote>Chưa có wave nào được tạo.</EmptyNote>
              ) : (
                <ul className="divide-y divide-line">
                  {waves.slice(0, 5).map((wave) => (
                    <li key={wave.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-ink">
                          {wave.code}
                        </span>
                        <StatusLabel tone={waveStatusTone(wave.status)}>
                          {waveStatusLabel(wave.status)}
                        </StatusLabel>
                      </div>
                      <div className="mt-0.5 flex justify-between text-[11px] text-ink-faint">
                        <span>
                          {wave.warehouseCode} · {wave.strategy} · {wave.orderCount} đơn
                        </span>
                        <span className="tabular-nums">{formatDateTimeVN(wave.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </EditorialSection>

            <EditorialSection title="Phiên đóng gói" eyebrow="Pack station">
              {sessions.length === 0 ? (
                <EmptyNote>Chưa có phiên đóng gói.</EmptyNote>
              ) : (
                <ul className="divide-y divide-line">
                  {sessions.slice(0, 5).map((session) => (
                    <li key={session.id} className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-ink">
                          {session.code}
                        </span>
                        <StatusLabel tone={PACK_STATUS_TONE[session.status]}>
                          {PACK_STATUS_LABEL[session.status]}
                        </StatusLabel>
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink-faint">
                        {session.orderTrackingCode} · {session.station} · độ tin cậy{' '}
                        {Math.round(session.confidence * 100)}%
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </EditorialSection>
          </div>
        </div>
      </DataState>
    </>
  );
}
