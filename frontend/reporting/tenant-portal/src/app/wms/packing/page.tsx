'use client';

import Link from 'next/link';
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
import type { InventoryItem, Order, PackSession } from '@/lib/mock';
import { formatDateTimeVN, formatNumber } from '@/lib/labels';

const PACK_STATUSES: PackSession['status'][] = ['OPEN', 'SEALED', 'VOID'];

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

const MATCH_LABELS: Record<PackSession['match'], string> = {
  MATCH: 'Khớp',
  MISMATCH: 'Lệch',
  OVERRIDE: 'Phê duyệt',
};

const MATCH_TONES: Record<PackSession['match'], 'success' | 'warning' | 'info'> = {
  MATCH: 'success',
  MISMATCH: 'warning',
  OVERRIDE: 'info',
};

// Đơn hàng được giao cho trạm đóng gói
const PACKING_ELIGIBLE: Order['status'][] = ['PENDING_PICKUP', 'PICKING'];

const STATION_LABELS: Record<string, string> = {
  'ST-1': 'Trạm 1',
  'ST-2': 'Trạm 2',
  'ST-3': 'Trạm 3',
};

const boxSizeOf = (weightKg: number) =>
  weightKg >= 10 ? 'XL' : weightKg >= 5 ? 'L' : weightKg >= 2 ? 'M' : 'S';

export default function WmsPackingPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PackSession[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stationFilter, setStationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<PackSession['status'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const [creating, setCreating] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [createStation, setCreateStation] = useState('ST-1');
  const [createOrderCode, setCreateOrderCode] = useState('');

  const [sealingId, setSealingId] = useState<string | null>(null);
  const [openSeal, setOpenSeal] = useState(false);
  const [sealSession, setSealSession] = useState<PackSession | null>(null);
  const [sealSku, setSealSku] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sessionRows, orderRows, inventoryRows] = await Promise.all([
        data.packSessions.list(),
        data.orders.list(),
        data.inventory.list(),
      ]);
      setSessions(sessionRows);
      setOrders(orderRows);
      setInventory(inventoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu đóng gói.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sessions
      .filter((row) => stationFilter === 'ALL' || row.station === stationFilter)
      .filter((row) => statusFilter === 'ALL' || row.status === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return (
          row.code.toLowerCase().includes(term) ||
          row.orderTrackingCode.toLowerCase().includes(term) ||
          row.station.toLowerCase().includes(term) ||
          row.expectedSku.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, stationFilter, statusFilter, search]);

  const openSessions = sessions.filter((row) => row.status === 'OPEN');
  const sealed = sessions.filter((row) => row.status === 'SEALED').length;
  const mismatches = sessions.filter((row) => row.match === 'MISMATCH').length;
  const pendingOrders = orders.filter((row) => PACKING_ELIGIBLE.includes(row.status)).length;

  const metrics: EditorialMetric[] = [
    { label: 'Phiên đang mở', value: formatNumber(openSessions.length), tone: 'default' },
    { label: 'Đã đóng kiện', value: formatNumber(sealed) },
    { label: 'Đơn chờ đóng gói', value: formatNumber(pendingOrders), tone: pendingOrders > 0 ? 'warning' : 'success' },
    { label: 'Lệch tiêu chuẩn', value: formatNumber(mismatches), tone: mismatches > 0 ? 'warning' : 'success' },
  ];

  const handleOpenCreate = () => {
    setNotice('');
    setOpenCreate(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    setNotice('');
    try {
      const term = createOrderCode.trim().toLowerCase();
      const order = orders.find((row) => row.trackingCode.toLowerCase() === term);
      if (!order) {
        setNotice('Không tìm thấy đơn hàng, kiểm tra lại mã đơn.');
        setCreating(false);
        return;
      }
      if (!PACKING_ELIGIBLE.includes(order.status)) {
        setNotice('Đơn hàng này đã qua trạm đóng gói, không thể tạo lại.');
        setCreating(false);
        return;
      }
      const fulfilled =
        inventory.find(
          (row) => row.warehouseId === order.warehouseId && row.available > 0,
        ) ?? null;
      const session = await data.packSessions.create({
        code: `PK-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        orderTrackingCode: order.trackingCode,
        station: createStation,
        operator: user?.fullName ?? 'Bạn (demo)',
        expectedSku: fulfilled ? fulfilled.sku : '',
        scannedSku: null,
        match: fulfilled ? 'MATCH' : 'MISMATCH',
        confidence: fulfilled ? 0.99 : 0.42,
        weightKg: order.weightKg,
        boxSize: boxSizeOf(order.weightKg),
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      });
      setNotice(`Tạo phiên ${session.code}, chuẩn bị đóng kiện.`);
      setOpenCreate(false);
      setCreateOrderCode('');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tạo được phiên đóng gói.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenSeal = (session: PackSession) => {
    setSealSession(session);
    setSealSku(session.scannedSku ?? '');
    setNotice('');
    setOpenSeal(true);
  };

  const handleSeal = async () => {
    setSealingId(sealSession?.id ?? null);
    setNotice('');
    try {
      if (!sealSession || !sealSku.trim()) {
        setNotice('Nhập hoặc quét SKU trước khi đóng kiện.');
        return;
      }
      const updated = await data.packSessions.seal(sealSession.id, sealSku.trim());
      if (updated.status === 'SEALED') {
        const order = orders.find((row) => row.trackingCode === sealSession.orderTrackingCode);
        if (order && PACKING_ELIGIBLE.includes(order.status)) {
          await data.orders.advanceStatus(order.id, 'PACKED', 'Đã đóng kiện');
        }
      }
      setNotice(`Đã đóng kiện ${updated.code}.`);
      setOpenSeal(false);
      setSealSession(null);
      setSealSku('');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không đóng kiện được.');
    } finally {
      setSealingId(null);
    }
  };

  const voidSession = async (session: PackSession) => {
    if (session.status !== 'OPEN') return;
    try {
      await data.packSessions.update(session.id, { status: 'VOID' });
      setNotice(`Đã huỷ phiên ${session.code}.`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không huỷ được phiên đóng gói.');
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Trạm đóng gói"
        title="Đóng gói"
        description="Quét mã đơn hàng cần đóng, kiểm tra SKU ngay tại trạm, hoàn tất đóng kiện rồi lưu trạng thái đơn hàng sang Đã đóng gói. Mỗi phiên là một đơn hàng."
        meta={`${filtered.length} / ${sessions.length} phiên`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/wms"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Trung tâm kho
            </Link>
            <Button size="sm" onClick={handleOpenCreate}>
              Tạo phiên mới
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

      <EditorialSection title="Phiên đóng gói" eyebrow="Theo hàng">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Select
              className="h-8"
              aria-label="Lọc theo trạm"
              value={stationFilter}
              onChange={(event) => setStationFilter(event.target.value)}
              options={[
                { value: 'ALL', label: 'Mọi trạm' },
                ...Object.entries(STATION_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
          <div className="w-40">
            <Select
              className="h-8"
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as PackSession['status'] | 'ALL')
              }
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                ...PACK_STATUSES.map((status) => ({
                  value: status,
                  label: PACK_STATUS_LABEL[status],
                })),
              ]}
            />
          </div>
          <div className="w-72">
            <Input
              type="search"
              placeholder="Tìm mã phiên, mã đơn, trạm, SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <DataState
          loading={loading}
          empty={!loading && filtered.length === 0}
          error={error}
          onRetry={load}
          emptyTitle="Không có phiên"
          emptyDescription="Chọn đơn hàng và tạo phiên đóng gói mới."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {['Mã phiên', 'Đơn', 'Trạm', 'Người gói', 'Dự kiến', 'Đã quét', 'Đối chiếu', 'Trọng lượng', 'Hộp', 'Ngày tạo', 'Trạng thái', ''].map(
                    (label, index) => (
                      <th
                        key={`${label}-${index}`}
                        className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
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
                  empty={!loading && filtered.length === 0}
                  error={error ? new Error(error) : undefined}
                  onRetry={load}
                  colSpan={12}
                  emptyTitle="Không có phiên trả khớp"
                  emptyDescription="Đổi bộ lọc hoặc thêm phiên đóng gói."
                >
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2 font-mono text-[11px] font-medium text-ink">
                        <Link href={`#session-${row.id}`} className="hover:underline">
                          {row.code}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px] text-ink">
                          <Link href={`/orders/${row.orderTrackingCode}`} className="hover:underline">
                            {row.orderTrackingCode}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone="info">{STATION_LABELS[row.station] ?? row.station}</StatusLabel>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{row.operator}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-faint">
                        {row.expectedSku || '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {row.scannedSku || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={MATCH_TONES[row.match]}>
                          {MATCH_LABELS[row.match]}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {formatNumber(row.weightKg)} kg
                      </td>
                      <td className="px-3 py-2 text-ink-faint">{row.boxSize}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-faint">
                        {formatDateTimeVN(row.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={PACK_STATUS_TONE[row.status]}>
                          {PACK_STATUS_LABEL[row.status]}
                        </StatusLabel>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {row.status === 'OPEN' ? (
                          <div className="flex items-center gap-3 text-[11px]">
                            <button
                              type="button"
                              className="font-semibold text-ink-soft hover:text-accent"
                              onClick={() => handleOpenSeal(row)}
                            >
                              Đóng kiện
                            </button>
                            <button
                              type="button"
                              className="font-semibold text-danger hover:underline"
                              onClick={() => voidSession(row)}
                            >
                              Huỷ
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </TableState>
              </tbody>
            </table>
          </div>
        </DataState>
      </EditorialSection>

      <EditorialSection title="Hướng dẫn đóng gói" eyebrow="Thao tác nhanh">
        <div className="grid gap-3 md:grid-cols-2">
          <EmptyNote>Quét mã đơn từ waypoint chờ đóng gói bằng thiết bị cầm tay.</EmptyNote>
          <EmptyNote>Nếu hai mã khác nhau, chọn "Lệch" rồi gửi đơn kiểm định lại.</EmptyNote>
        </div>
      </EditorialSection>

      <Modal
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Tạo phiên đóng gói"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenCreate(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={handleCreate} isLoading={creating}>
              Tạo phiên
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-[12px]">
          <p className="text-[11px] text-ink-faint">
            Chọn trạm đóng gói cố định, quét (hoặc nhập) mã đơn muốn đóng, sau đó xác nhận.
          </p>
          <Select
            label="Trạm đóng gói"
            value={createStation}
            onChange={(event) => setCreateStation(event.target.value)}
            options={Object.entries(STATION_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Input
            label="Mã đơn hàng cần đóng"
            value={createOrderCode}
            onChange={(event) => setCreateOrderCode(event.target.value)}
            placeholder="SLG-20261110 ..."
            className="h-10"
          />
          {pendingOrders > 0 ? (
            <EmptyNote>
              {pendingOrders} đơn hàng chờ đóng gói, có thể đóng trực tiếp từ danh sách.
            </EmptyNote>
          ) : (
            <EmptyNote>Không có đơn hàng chờ đóng gói; chọn đơn mới hoặc quay lại sau.</EmptyNote>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={openSeal}
        onClose={() => setOpenSeal(false)}
        title="Đóng kiện"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenSeal(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={handleSeal} isLoading={sealingId !== null}>
              Đóng kiện
            </Button>
          </div>
        }
      >
        {sealSession ? (
          <div className="space-y-3">
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="flex justify-between">
                <span>Đơn</span>
                <span className="font-mono text-ink">{sealSession.orderTrackingCode}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Trạm</span>
                <span className="text-ink">{STATION_LABELS[sealSession.station] ?? sealSession.station}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Dự kiến</span>
                <span className="font-mono text-ink">{sealSession.expectedSku || '—'}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Trọng lượng</span>
                <span className="tabular-nums text-ink">{formatNumber(sealSession.weightKg)} kg</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Hộp</span>
                <span className="text-ink">{sealSession.boxSize}</span>
              </div>
            </div>
            <Input
              label="SKU hàng đóng gói"
              type="search"
              value={sealSku}
              onChange={(event) => setSealSku(event.target.value)}
              placeholder="Quét SKU từ barcode, SKU dự kiến: chọn"
              className="h-10"
            />
            <p className="text-[11px] text-ink-faint">
              Nhập SKU đúng với đơn hàng, khác biệt được ghi nhận khi mở phiên.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
