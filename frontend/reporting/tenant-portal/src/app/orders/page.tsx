'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { data } from '@/lib/data';
import { useRole } from '@/lib/use-role';
import {
  EditorialPageHeader,
  EditorialSection,
  MetricBand,
  StatusLabel,
  EmptyNote,
} from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';
import { Button, Input, Modal, Pagination, Select, TableState } from 'ui-components';
import type { Client, Order, OrderStatus, ServiceLevel, Warehouse } from '@/lib/mock';
import {
  formatCurrency,
  formatDateTimeVN,
  formatNumber,
  orderStatusLabel,
  orderStatusTone,
  serviceLabel,
} from '@/lib/labels';

const PAGE_SIZE = 12;

const SERVICE_LABELS: Record<ServiceLevel, string> = {
  STANDARD: 'Tiêu chuẩn',
  EXPRESS: 'Nhanh',
  SAME_DAY: 'Trong ngày',
};

/** Bước tiến hợp lệ của đơn — phản chiếu state machine ở BE. */
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  NEW: { status: 'UNASSIGNED', label: 'Chuyển chưa gán chuyến' },
  UNASSIGNED: { status: 'PENDING_PICKUP', label: 'Chờ lấy hàng' },
  PENDING_PICKUP: { status: 'PICKING', label: 'Bắt đầu soạn' },
  PICKING: { status: 'PACKED', label: 'Đã đóng gói' },
  PACKED: { status: 'IN_TRANSIT', label: 'Bàn giao vận chuyển' },
  IN_TRANSIT: { status: 'OUT_FOR_DELIVERY', label: 'Bắt đầu phát' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED', label: 'Giao thành công' },
  FAILED: { status: 'RETURN_REQUESTED', label: 'Tạo yêu cầu trả' },
  RETURN_REQUESTED: { status: 'RETURNED', label: 'Xác nhận đã trả hàng' },
};

const CANCELLABLE: OrderStatus[] = ['NEW', 'UNASSIGNED', 'PENDING_PICKUP'];

/** Đơn đang trên đường mới có thể ghi nhận giao thất bại. */
const FAILABLE: OrderStatus[] = ['IN_TRANSIT', 'OUT_FOR_DELIVERY'];

const ALL_STATUSES: OrderStatus[] = [
  'NEW',
  'UNASSIGNED',
  'PENDING_PICKUP',
  'PICKING',
  'PACKED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURN_REQUESTED',
  'RETURNED',
  'CANCELLED',
];

/** Tách một dòng CSV, hỗ trợ dấu phẩy hoặc chấm phẩy và ô có ngoặc kép. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',' || char === ';') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isCsvHeader(cells: string[]) {
  const row = cells.join(' ').toLowerCase();
  return row.includes('tên') && (row.includes('điện thoại') || row.includes('số điện thoại'));
}

const PROVINCES = [
  { value: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009, districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Tân Bình', 'Thủ Đức'] },
  { value: 'Bình Dương', lat: 10.9239, lng: 106.7147, districts: ['Thuận An', 'Dĩ An', 'Thủ Dầu Một'] },
  { value: 'Đồng Nai', lat: 10.9574, lng: 106.8427, districts: ['Biên Hòa', 'Long Thành'] },
  { value: 'Đà Nẵng', lat: 16.0471, lng: 108.2196, districts: ['Hải Châu', 'Thanh Khê'] },
  { value: 'Hà Nội', lat: 21.0313, lng: 105.7987, districts: ['Cầu Giấy', 'Hoàng Mai'] },
];

type OrderForm = {
  clientId: string;
  warehouseId: string;
  clientOrderRef: string;
  name: string;
  phone: string;
  address: string;
  ward: string;
  district: string;
  province: string;
  service: ServiceLevel;
  weightKg: string;
  itemCount: string;
  codAmount: string;
  shippingFee: string;
  notes: string;
};

const EMPTY_FORM: OrderForm = {
  clientId: '',
  warehouseId: '',
  clientOrderRef: '',
  name: '',
  phone: '',
  address: '',
  ward: '',
  district: 'Quận 1',
  province: 'TP. Hồ Chí Minh',
  service: 'STANDARD',
  weightKg: '1',
  itemCount: '1',
  codAmount: '0',
  shippingFee: '24000',
  notes: '',
};

function isLate(order: Order) {
  if (['DELIVERED', 'RETURNED', 'CANCELLED'].includes(order.status)) return false;
  return new Date(order.promisedAt).getTime() < Date.now();
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<ServiceLevel | 'ALL'>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const { can } = useRole();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState('');

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [failTarget, setFailTarget] = useState<Order | null>(null);
  const [failing, setFailing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success');

  const notify = (message: string, tone: 'success' | 'error' = 'success') => {
    setNotice(message);
    setNoticeTone(tone);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orderRows, clientRows, warehouseRows] = await Promise.all([
        data.orders.list(),
        data.clients.list(),
        data.warehouses.list(),
      ]);
      setOrders(orderRows);
      setClients(clientRows);
      setWarehouses(warehouseRows);
      setForm((current) => ({
        ...current,
        clientId: current.clientId || clientRows[0]?.id || '',
        warehouseId: current.warehouseId || warehouseRows[0]?.id || '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách đơn hàng.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter((order) => (statusFilter === 'ALL' ? true : order.status === statusFilter))
      .filter((order) => (serviceFilter === 'ALL' ? true : order.service === serviceFilter))
      .filter((order) =>
        warehouseFilter === 'ALL' ? true : order.warehouseId === warehouseFilter,
      )
      .filter((order) => {
        if (!term) return true;
        return (
          order.trackingCode.toLowerCase().includes(term) ||
          order.clientName.toLowerCase().includes(term) ||
          order.customer.name.toLowerCase().includes(term) ||
          order.customer.phone.includes(term)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, search, statusFilter, serviceFilter, warehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const metrics: EditorialMetric[] = [
    {
      label: 'Tổng đơn',
      value: formatNumber(orders.length),
      meta: `${formatNumber(filtered.length)} trong bộ lọc`,
    },
    {
      label: 'Chờ xử lý',
      value: formatNumber(
        orders.filter((order) =>
          ['NEW', 'UNASSIGNED', 'PENDING_PICKUP'].includes(order.status),
        ).length,
      ),
      meta: 'Mới · chưa gán · chờ lấy',
      tone: 'warning',
    },
    {
      label: 'Đang giao',
      value: formatNumber(
        orders.filter((order) => ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order.status))
          .length,
      ),
      meta: `${orders.filter((order) => order.status === 'PACKED').length} đơn đã đóng gói`,
    },
    {
      label: 'COD đang thu',
      value: formatCurrency(
        orders
          .filter((order) => order.codAmount > 0 && order.status !== 'CANCELLED')
          .reduce((sum, order) => sum + order.codAmount, 0),
      ),
      meta: 'Chưa đối soát',
    },
  ];

  const advance = async (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyId(order.id);
    setNotice('');
    try {
      await data.orders.advanceStatus(order.id, next.status, next.label);
      notify(`Đơn ${order.trackingCode} → ${orderStatusLabel(next.status)}.`);
      await load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Không cập nhật được trạng thái.',
        'error',
      );
    } finally {
      setBusyId(null);
    }
  };

  const failDelivery = async () => {
    if (!failTarget) return;
    setFailing(true);
    try {
      await data.orders.advanceStatus(
        failTarget.id,
        'FAILED',
        'Giao thất bại — khách không nhận hàng',
      );
      notify(`Đã ghi nhận giao thất bại cho đơn ${failTarget.trackingCode}.`);
      setFailTarget(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không ghi nhận được giao thất bại.', 'error');
    } finally {
      setFailing(false);
    }
  };

  const cancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await data.orders.advanceStatus(
        cancelTarget.id,
        'CANCELLED',
        'Huỷ đơn theo yêu cầu khách hàng',
      );
      notify(`Đã huỷ đơn ${cancelTarget.trackingCode}.`);
      setCancelTarget(null);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không huỷ được đơn.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const province = PROVINCES.find((row) => row.value === form.province) ?? PROVINCES[0];
    setSaving(true);
    try {
      const created = await data.orders.createOrder({
        clientId: form.clientId,
        warehouseId: form.warehouseId,
        service: form.service,
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          ward: form.ward.trim() || `Phường ${1 + (form.name.length % 12)}`,
          district: form.district,
          province: form.province,
          lat: Number((province.lat + (Math.random() - 0.5) * 0.02).toFixed(6)),
          lng: Number((province.lng + (Math.random() - 0.5) * 0.02).toFixed(6)),
        },
        codAmount: Number(form.codAmount) || 0,
        shippingFee: Number(form.shippingFee) || 24_000,
        weightKg: Number(form.weightKg) || 1,
        itemCount: Number(form.itemCount) || 1,
        notes: form.notes.trim() || undefined,
      });
      setCreateOpen(false);
      setForm((current) => ({ ...EMPTY_FORM, clientId: current.clientId, warehouseId: current.warehouseId }));
      setNotice(`Đã tạo đơn ${created.trackingCode}.`);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Không tạo được đơn hàng.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Nhập hàng loạt: mỗi dòng CSV gồm
   * tên người nhận, số điện thoại, địa chỉ, quận, COD.
   * Đơn được tạo thật trong mock và hiện ngay ở bảng bên dưới.
   */
  const submitBulk = async () => {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setBulkResult('Chưa có dòng dữ liệu nào để nhập.');
      return;
    }
    const clientId = form.clientId || clients[0]?.id;
    const warehouseId = form.warehouseId || warehouses[0]?.id;
    if (!clientId || !warehouseId) {
      setBulkResult('Thiếu khách hàng hoặc kho nhận. Tải lại trang rồi thử lại.');
      return;
    }
    setBulkBusy(true);
    setBulkResult('');
    let created = 0;
    const failures: string[] = [];
    for (const [index, line] of lines.entries()) {
      const cells = parseCsvLine(line);
      if (isCsvHeader(cells)) continue;
      const [name, phone, address, district, cod] = cells;
      try {
        await data.orders.createOrder({
          clientId,
          warehouseId,
          customer: {
            name: name || `Người nhận ${index + 1}`,
            phone,
            address: address || 'Chưa cập nhật',
            ward: 'Phường 1',
            district: district || 'Quận 1',
            province: 'TP. Hồ Chí Minh',
            lat: 10.7769,
            lng: 106.7009,
          },
          codAmount: Number(cod) || 0,
          itemCount: 1,
          weightKg: 1,
        });
        created += 1;
      } catch (err) {
        failures.push(`Dòng ${index + 1}: ${err instanceof Error ? err.message : 'lỗi'}`);
      }
    }
    setBulkResult(
      `Tạo thành công ${created}/${lines.length} đơn.${failures.length ? ` ${failures.length} dòng lỗi: ${failures[0]}` : ''}`,
    );
    if (created > 0) await load();
    setBulkBusy(false);
  };

  const activeFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    serviceFilter !== 'ALL' ||
    warehouseFilter !== 'ALL';

  return (
    <>
      <EditorialPageHeader
        eyebrow="Vận hành · Đơn hàng"
        title="Đơn hàng"
        description="Danh sách đơn theo kho, dịch vụ và trạng thái. Mỗi lần đổi trạng thái đều đi qua state machine của backend và ghi vào dòng thời gian của đơn."
        meta={`${filtered.length} / ${orders.length} đơn`}
        actions={
          <div className="flex items-center gap-2">
            {can('order:write') && (
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                Nhập hàng loạt
              </Button>
            )}
            {can('order:write') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Tạo đơn
              </Button>
            )}
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
        title="Hàng đợi đơn hàng"
        eyebrow="Bảng vận hành"
        action={
          <span className="text-[11px] text-ink-faint">
            Trang {currentPage}/{totalPages}
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="search"
            placeholder="Tìm mã đơn, khách, người nhận, SĐT"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-9 w-72"
          />
          <div className="w-48">
            <Select
              className="h-9"
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as OrderStatus | 'ALL');
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Mọi trạng thái' },
                ...(
                  [
                    'NEW',
                    'UNASSIGNED',
                    'PENDING_PICKUP',
                    'PICKING',
                    'PACKED',
                    'IN_TRANSIT',
                    'OUT_FOR_DELIVERY',
                    'DELIVERED',
                    'FAILED',
                    'RETURN_REQUESTED',
                    'RETURNED',
                    'CANCELLED',
                  ] as OrderStatus[]
                ).map((status) => ({ value: status, label: orderStatusLabel(status) })),
              ]}
            />
          </div>
          <div className="w-40">
            <Select
              className="h-9"
              aria-label="Lọc theo dịch vụ"
              value={serviceFilter}
              onChange={(event) => {
                setServiceFilter(event.target.value as ServiceLevel | 'ALL');
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Mọi dịch vụ' },
                ...(['STANDARD', 'EXPRESS', 'SAME_DAY'] as ServiceLevel[]).map((service) => ({
                  value: service,
                  label: SERVICE_LABELS[service],
                })),
              ]}
            />
          </div>
          <div className="w-48">
            <Select
              className="h-9"
              aria-label="Lọc theo kho"
              value={warehouseFilter}
              onChange={(event) => {
                setWarehouseFilter(event.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Mọi kho' },
                ...warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: `${warehouse.code} · ${warehouse.name}`,
                })),
              ]}
            />
          </div>
          {activeFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setServiceFilter('ALL');
                setWarehouseFilter('ALL');
                setPage(1);
              }}
            >
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {[
                  'Mã đơn',
                  'Người nhận',
                  'Khách hàng',
                  'Trạng thái',
                  'Dịch vụ',
                  'Kho',
                  'COD',
                  'Hẹn giao',
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
                empty={!loading && paged.length === 0}
                error={error ? new Error(error) : undefined}
                onRetry={load}
                colSpan={9}
                emptyTitle={activeFilters ? 'Không có đơn khớp bộ lọc' : 'Chưa có đơn hàng'}
                emptyDescription={
                  activeFilters
                    ? 'Thử xoá bộ lọc hoặc tìm bằng mã đơn khác.'
                    : 'Tạo đơn đầu tiên để bắt đầu luồng vận hành.'
                }
              >
                {paged.map((order) => {
                  const next = NEXT_STATUS[order.status];
                  const late = isLate(order);
                  return (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-surface-alt"
                      onClick={() => router.push(`/orders/${order.trackingCode}`)}
                    >
                      <td className="px-3 py-2">
                        <Link
                          href={`/orders/${order.trackingCode}`}
                          onClick={(event) => event.stopPropagation()}
                          className="font-mono text-[12px] font-semibold text-ink hover:text-accent"
                        >
                          {order.trackingCode}
                        </Link>
                        {late ? (
                          <div className="mt-0.5">
                            <StatusLabel tone="warning">Trễ hẹn</StatusLabel>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{order.customer.name}</div>
                        <div className="text-[11px] text-ink-faint">
                          {order.customer.district} · {order.customer.phone}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{order.clientName}</td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={orderStatusTone(order.status)}>
                          {orderStatusLabel(order.status)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{serviceLabel(order.service)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {warehouses.find((row) => row.id === order.warehouseId)?.code ?? '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">
                        {order.codAmount > 0 ? formatCurrency(order.codAmount) : '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {formatDateTimeVN(order.promisedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-3 text-[11px]">
                          {next ? (
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                advance(order);
                              }}
                              className="font-semibold text-ink-soft hover:text-accent disabled:opacity-50"
                            >
                              {next.label}
                            </button>
                          ) : null}
                          {CANCELLABLE.includes(order.status) ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCancelTarget(order);
                              }}
                              className="font-semibold text-danger hover:underline"
                            >
                              Huỷ
                            </button>
                          ) : null}
                          {FAILABLE.includes(order.status) ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setFailTarget(order);
                              }}
                              className="font-semibold text-danger hover:underline"
                            >
                              Giao thất bại
                            </button>
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

        {filtered.length > PAGE_SIZE ? (
          <div className="flex justify-center py-3">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </EditorialSection>

      <EditorialSection title="Luồng trạng thái đơn" eyebrow="Ch. 8 · State machine">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-ink-soft">
          {(
            [
              'NEW',
              'UNASSIGNED',
              'PENDING_PICKUP',
              'PICKING',
              'PACKED',
              'IN_TRANSIT',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
            ] as OrderStatus[]
          ).map((status, index, list) => (
            <span key={status} className="inline-flex items-center gap-3">
              <StatusLabel tone={orderStatusTone(status)}>{orderStatusLabel(status)}</StatusLabel>
              {index < list.length - 1 ? <span className="text-line-strong">→</span> : null}
            </span>
          ))}
          <span className="text-line-strong">|</span>
          <span className="text-ink-faint">
            Nhánh lỗi: Giao thất bại → Yêu cầu trả → Đã trả. Huỷ chỉ từ trạng thái đầu.
          </span>
        </div>
      </EditorialSection>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo đơn hàng"
        size="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" type="submit" form="create-order-form" isLoading={saving}>
              Tạo đơn
            </Button>
          </div>
        }
      >
        <form id="create-order-form" onSubmit={submitCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Khách hàng (chủ đơn)"
              value={form.clientId}
              onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
              options={clients.map((client) => ({
                value: client.id,
                label: `${client.code} · ${client.name}`,
              }))}
            />
            <Select
              label="Kho nhận hàng"
              value={form.warehouseId}
              onChange={(event) =>
                setForm((current) => ({ ...current, warehouseId: event.target.value }))
              }
              options={warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: `${warehouse.code} · ${warehouse.name}`,
              }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Tên người nhận"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nguyễn Thị Lan"
            />
            <Input
              label="Số điện thoại"
              required
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="0901234567"
            />
          </div>
          <Input
            label="Địa chỉ"
            required
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            placeholder="Số nhà, đường, phường"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Phường/Xã"
              value={form.ward}
              onChange={(event) => setForm((current) => ({ ...current, ward: event.target.value }))}
              placeholder="Phường 1"
            />
            <Select
              label="Quận/Huyện"
              value={form.district}
              onChange={(event) =>
                setForm((current) => ({ ...current, district: event.target.value }))
              }
              options={
                (PROVINCES.find((row) => row.value === form.province) ?? PROVINCES[0]).districts.map(
                  (district) => ({ value: district, label: district }),
                )
              }
            />
            <Select
              label="Tỉnh/Thành"
              value={form.province}
              onChange={(event) => {
                const province = PROVINCES.find((row) => row.value === event.target.value);
                setForm((current) => ({
                  ...current,
                  province: event.target.value,
                  district: province?.districts[0] ?? current.district,
                }));
              }}
              options={PROVINCES.map((province) => ({
                value: province.value,
                label: province.value,
              }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Dịch vụ"
              value={form.service}
              onChange={(event) =>
                setForm((current) => ({ ...current, service: event.target.value as ServiceLevel }))
              }
              options={(['STANDARD', 'EXPRESS', 'SAME_DAY'] as ServiceLevel[]).map((service) => ({
                value: service,
                label: SERVICE_LABELS[service],
              }))}
            />
            <Input
              label="Khối lượng (kg)"
              type="number"
              min={0.1}
              step="0.1"
              value={form.weightKg}
              onChange={(event) =>
                setForm((current) => ({ ...current, weightKg: event.target.value }))
              }
            />
            <Input
              label="Số món"
              type="number"
              min={1}
              value={form.itemCount}
              onChange={(event) =>
                setForm((current) => ({ ...current, itemCount: event.target.value }))
              }
            />
            <Input
              label="COD (₫)"
              type="number"
              min={0}
              step="1000"
              value={form.codAmount}
              onChange={(event) =>
                setForm((current) => ({ ...current, codAmount: event.target.value }))
              }
            />
            <Input
              label="Phí giao (₫)"
              type="number"
              min={0}
              step="1000"
              value={form.shippingFee}
              onChange={(event) =>
                setForm((current) => ({ ...current, shippingFee: event.target.value }))
              }
            />
          </div>
          <Input
            label="Ghi chú"
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Ví dụ: gọi trước 30 phút, giao giờ hành chính"
          />
          {formError ? (
            <p className="border-l-2 border-danger pl-2 text-[12px] text-danger">{formError}</p>
          ) : null}
          <p className="text-[11px] text-ink-faint">
            Backend kiểm tra số điện thoại, kho đang hoạt động và khối lượng trước khi tạo — lỗi
            trả về hiển thị ngay tại đây.
          </p>
        </form>
      </Modal>

      <Modal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Nhập đơn hàng loạt"
        size="full"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitBulk} isLoading={bulkBusy}>
              Nhập các dòng
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[12px] leading-6 text-ink-soft">
            Dán danh sách đơn, mỗi dòng một đơn theo thứ tự:{' '}
            <span className="font-mono text-[11px] text-ink">
              tên người nhận, số điện thoại, địa chỉ, quận, COD
            </span>
            . Mỗi dòng hợp lệ được tạo thành một đơn thật trong bộ dữ liệu mẫu.
          </p>
          <textarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            rows={7}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-[12px] text-ink focus:border-accent focus:outline-none"
            placeholder={'Trần Văn Hùng, 0908123456, 12 Nguyễn Huệ, Quận 1, 450000\nLê Thị Mai, 0912345678, 88 Cách Mạng Tháng 8, Quận 3, 0'}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-[11px] font-semibold text-accent hover:underline"
              onClick={() =>
                setBulkText(
                  'Trần Văn Hùng, 0908123456, 12 Nguyễn Huệ, Quận 1, 450000\nLê Thị Mai, 0912345678, 88 Cách Mạng Tháng 8, Quận 3, 0\nPhạm Quốc Bảo, 0938111222, 25 Phan Xích Long, Tân Bình, 320000',
                )
              }
            >
              Dùng dữ liệu mẫu
            </button>
            <button
              type="button"
              className="text-[11px] font-semibold text-ink-soft hover:text-accent"
              onClick={() => {
                setBulkText('');
                setBulkResult('');
              }}
            >
              Xoá nội dung
            </button>
          </div>
          {bulkResult ? (
            <p className="border-l-2 border-accent pl-2 text-[12px] text-ink">{bulkResult}</p>
          ) : (
            <EmptyNote>
              Chưa nhập dòng nào. Hệ thống sẽ báo rõ số đơn tạo được và dòng lỗi nếu có.
            </EmptyNote>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Huỷ đơn hàng"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
              Giữ đơn
            </Button>
            <Button variant="danger" size="sm" onClick={cancel} isLoading={cancelling}>
              Huỷ đơn
            </Button>
          </div>
        }
      >
        {cancelTarget ? (
          <div className="space-y-2 text-[13px] text-ink-soft">
            <p>
              Đơn <span className="font-mono font-semibold text-ink">{cancelTarget.trackingCode}</span>{' '}
              của {cancelTarget.customer.name} sẽ chuyển sang trạng thái Đã huỷ.
            </p>
            <p className="text-[12px] text-ink-faint">
              Chỉ huỷ được khi đơn chưa soạn hàng. Sau bước soạn, phải tạo yêu cầu trả hàng.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={failTarget !== null}
        onClose={() => setFailTarget(null)}
        title="Giao thất bại"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setFailTarget(null)}>
              Giữ lại
            </Button>
            <Button variant="danger" size="sm" onClick={failDelivery} isLoading={failing}>
              Giao thất bại
            </Button>
          </div>
        }
      >
        {failTarget ? (
          <div className="space-y-2 text-[13px] text-ink-soft">
            <p>
              Đơn <span className="font-mono font-semibold text-ink">{failTarget.trackingCode}</span>{' '}
              của {failTarget.customer.name} sẽ chuyển sang trạng thái Giao thất bại.
            </p>
            <p className="text-[12px] text-ink-faint">
              Bắt đầu xử lý yêu cầu trả hàng từ khách.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
