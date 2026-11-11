'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { Button, DataState, Input, Modal } from 'ui-components';
import type { Order, OrderRoute, OrderStatus, Trip, Warehouse } from '@/lib/mock';
import {
  formatCurrency,
  formatDateTimeVN,
  formatNumber,
  orderStatusLabel,
  orderStatusTone,
  serviceLabel,
} from '@/lib/labels';
import MapCanvas from '@/components/demo/MapCanvas';
import type { LatLng, MapMarker, MapPolyline } from '@/components/demo/MapCanvas';

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

const TERMINAL: OrderStatus[] = ['DELIVERED', 'RETURNED', 'CANCELLED'];

/** Đơn đang trên đường mới có thể ghi nhận giao thất bại. */
const FAILABLE: OrderStatus[] = ['IN_TRANSIT', 'OUT_FOR_DELIVERY'];

type SlaView = {
  sla: string;
  promisedAt: string;
  actualAt: string | null;
  satisfied: boolean;
  reason?: string;
};

export default function OrderDetailPage() {
  const params = useParams<{ trackingCode: string }>();
  const trackingCode = decodeURIComponent(params?.trackingCode ?? '');

  const [order, setOrder] = useState<Order | null>(null);
  const [route, setRoute] = useState<OrderRoute | null>(null);
  const [sla, setSla] = useState<SlaView | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failTarget, setFailTarget] = useState<Order | null>(null);
  const [failing, setFailing] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialNote, setPartialNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const found = await data.orders.byTrackingCode(trackingCode);
      if (!found) {
        setOrder(null);
        setError(new Error('Không tìm thấy đơn hàng với mã vận đơn này.'));
        return;
      }
      setOrder(found);
      const [live, slaView, tripRows, warehouseRows] = await Promise.all([
        data.orders.live(found.trackingCode).catch(() => null),
        data.orders.sla(found.trackingCode).catch(() => null),
        data.trips.list(),
        data.warehouses.list(),
      ]);
      setRoute(live);
      setSla(slaView as SlaView | null);
      setTrips(tripRows);
      setWarehouses(warehouseRows);
      setNewDate(found.promisedAt.slice(0, 16));
    } catch (err) {
      setError(new Error(err instanceof Error ? err.message : 'Không tải được đơn hàng.'));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    load();
  }, [load]);

  const trip = useMemo(
    () => (order?.tripId ? trips.find((row) => row.id === order.tripId) ?? null : null),
    [trips, order],
  );

  const warehouse = useMemo(
    () => warehouses.find((row) => row.id === order?.warehouseId) ?? null,
    [warehouses, order],
  );

  const markers = useMemo<MapMarker[]>(() => {
    if (!order) return [];
    const rows: MapMarker[] = [
      {
        id: 'destination',
        lat: order.customer.lat,
        lng: order.customer.lng,
        label: order.customer.district,
        kind: 'dropoff',
        tone: 'accent',
      },
    ];
    if (trip) {
      trip.stops.forEach((stop) => {
        rows.push({
          id: stop.id,
          lat: stop.lat,
          lng: stop.lng,
          label: stop.orderTrackingCode === order.trackingCode ? 'Điểm của đơn này' : undefined,
          kind: stop.orderTrackingCode === order.trackingCode ? 'warehouse' : 'checkpoint',
          tone: stop.status === 'DELIVERED' ? 'success' : 'neutral',
        });
      });
    }
    return rows;
  }, [order, trip]);

  const polylines = useMemo<MapPolyline[]>(() => {
    if (!trip || trip.stops.length < 2) return [];
    return [
      {
        id: 'trip',
        points: trip.stops.map((stop) => [stop.lat, stop.lng] as LatLng),
        color: '#2f4a3c',
        width: 3,
      },
    ];
  }, [trip]);

  const advance = async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusy(true);
    setNotice('');
    try {
      await data.orders.advanceStatus(order.id, next.status, next.label);
      setNotice(`Đã chuyển sang ${orderStatusLabel(next.status)}.`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không cập nhật được trạng thái.');
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await data.orders.advanceStatus(order.id, 'CANCELLED', 'Huỷ đơn theo yêu cầu');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không huỷ được đơn.');
    } finally {
      setBusy(false);
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
      setNotice(`Đã ghi nhận giao thất bại cho đơn ${failTarget.trackingCode}.`);
      setFailTarget(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không ghi nhận được giao thất bại.');
    } finally {
      setFailing(false);
    }
  };

  const submitReschedule = async () => {
    if (!order) return;
    const promisedAt = new Date(newDate);
    if (!newDate || Number.isNaN(promisedAt.getTime())) {
      setNotice('Chọn thời gian hẹn giao mới.');
      return;
    }
    setBusy(true);
    try {
      await data.orders.reschedule(
        order.id,
        promisedAt.toISOString(),
        reason.trim() || 'Đổi lịch giao',
      );
      setRescheduleOpen(false);
      setReason('');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không đổi được lịch giao.');
    } finally {
      setBusy(false);
    }
  };

  const submitPartial = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await data.orders.partialShipment(order.id, partialNote);
      setPartialOpen(false);
      setPartialNote('');
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tạo được đơn phân chia.');
    } finally {
      setBusy(false);
    }
  };

  const metrics: EditorialMetric[] = order
    ? [
        {
          label: 'COD',
          value: order.codAmount > 0 ? formatCurrency(order.codAmount) : 'Không thu',
          meta: `Phí giao ${formatCurrency(order.shippingFee)}`,
        },
        {
          label: 'Khối lượng',
          value: `${formatNumber(order.weightKg)} kg`,
          meta: `${order.itemCount} món · ${order.volumeCbm} m³`,
        },
        {
          label: 'Hẹn giao',
          value: formatDateTimeVN(order.promisedAt),
          meta: sla ? (sla.satisfied ? 'Trong SLA' : 'Ngoài SLA') : 'Đang tính SLA',
          tone: sla && !sla.satisfied ? 'danger' : 'default',
        },
        {
          label: 'Kho nhận',
          value: warehouse?.code ?? '—',
          meta: warehouse?.name,
        },
      ]
    : [];

  const next = order ? NEXT_STATUS[order.status] : undefined;

  return (
    <>
      <EditorialPageHeader
        eyebrow={
          <>
            <Link href="/orders" className="hover:text-accent">
              Đơn hàng
            </Link>
            <span className="text-line-strong">/</span>
            <span className="font-mono">{trackingCode}</span>
          </>
        }
        title="Chi tiết đơn hàng"
        description={
          order
            ? `${order.customer.name} · ${order.customer.address}, ${order.customer.district}, ${order.customer.province}`
            : 'Đang tải thông tin đơn hàng.'
        }
        meta={order ? <StatusLabel tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusLabel> : undefined}
        actions={
          order ? (
            <div className="flex flex-wrap items-center gap-2">
              {next ? (
                <Button size="sm" onClick={advance} isLoading={busy}>
                  {next.label}
                </Button>
              ) : null}
              {FAILABLE.includes(order.status) ? (
                <Button variant="outline" size="sm" onClick={() => setFailTarget(order)} disabled={busy}>
                  Giao thất bại
                </Button>
              ) : null}
              {!TERMINAL.includes(order.status) ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(true)}>
                    Đổi lịch giao
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPartialOpen(true)}>
                    Phân đơn
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelOrder} disabled={busy}>
                    Huỷ đơn
                  </Button>
                </>
              ) : null}
            </div>
          ) : null
        }
      />

      <DataState loading={loading} empty={!loading && !order} error={error} onRetry={load}>
        {order ? (
          <>
            <MetricBand metrics={metrics} />

            {notice ? (
              <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
                {notice}
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                <EditorialSection title="Dòng thời gian xử lý" eyebrow="Audit trail">
                  <ol className="border-l border-line pl-4">
                    {[...order.timeline].reverse().map((event, index) => (
                      <li key={`${event.at}-${index}`} className="relative pb-4 last:pb-0">
                        <span
                          className="absolute -left-[21px] top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        <div className="text-[12px] font-medium text-ink">{event.label}</div>
                        <div className="text-[11px] text-ink-faint tabular-nums">
                          {formatDateTimeVN(event.at)} · {event.actor}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {order.timeline.length === 0 ? <EmptyNote>Chưa có sự kiện nào.</EmptyNote> : null}
                </EditorialSection>

                <EditorialSection title="Thông tin giao hàng" eyebrow="Người nhận">
                  <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
                    {[
                      ['Người nhận', order.customer.name],
                      ['Điện thoại', order.customer.phone],
                      ['Địa chỉ', order.customer.address],
                      ['Phường/Xã', order.customer.ward],
                      ['Quận/Huyện', order.customer.district],
                      ['Tỉnh/Thành', order.customer.province],
                      ['Khách hàng', order.clientName],
                      ['Mã tham chiếu', order.clientOrderRef],
                      ['Dịch vụ', serviceLabel(order.service)],
                      ['Tạo lúc', formatDateTimeVN(order.createdAt)],
                      ['Cập nhật', formatDateTimeVN(order.updatedAt)],
                      ['Chuyến', trip ? trip.code : 'Chưa gán chuyến'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3 border-b border-line py-1">
                        <dt className="text-ink-faint">{label}</dt>
                        <dd className="text-right text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {order.notes ? (
                    <p className="mt-3 border-l-2 border-line-strong pl-3 text-[12px] text-ink-soft">
                      Ghi chú: {order.notes}
                    </p>
                  ) : null}
                </EditorialSection>
              </div>

              <div className="space-y-6">
                <EditorialSection title="Vị trí & lộ trình" eyebrow="Theo dõi trực tiếp">
                  <MapCanvas
                    height={300}
                    markers={markers}
                    polylines={polylines}
                    vehicles={
                      trip
                        ? [
                            {
                              id: trip.id,
                              label: trip.vehiclePlate,
                              route: trip.stops.map((stop) => [stop.lat, stop.lng] as LatLng),
                              tone: 'info',
                            },
                          ]
                        : []
                    }
                    animate={Boolean(trip)}
                    ariaLabel="Bản đồ theo dõi đơn hàng"
                  />
                  <div className="mt-3 space-y-1 text-[12px] text-ink-soft">
                    {route?.nextStop ? (
                      <div className="flex justify-between">
                        <span>Điểm kế tiếp</span>
                        <span className="text-ink">{route.nextStop.name}</span>
                      </div>
                    ) : null}
                    {route?.eta ? (
                      <div className="flex justify-between">
                        <span>ETA</span>
                        <span className="tabular-nums text-ink">{formatDateTimeVN(route.eta)}</span>
                      </div>
                    ) : null}
                    {route?.driver?.name ? (
                      <div className="flex justify-between">
                        <span>Tài xế</span>
                        <span className="text-ink">
                          {route.driver.name} · {route.driver.plate}
                        </span>
                      </div>
                    ) : (
                      <EmptyNote>Đơn chưa được gán chuyến nên chưa có vị trí trực tiếp.</EmptyNote>
                    )}
                  </div>
                </EditorialSection>

                <EditorialSection title="SLA" eyebrow="Cam kết giao hàng">
                  {sla ? (
                    <div className="space-y-1.5 text-[12px] text-ink-soft">
                      <div className="flex justify-between">
                        <span>Loại cam kết</span>
                        <span className="text-ink">{sla.sla}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hẹn giao</span>
                        <span className="tabular-nums text-ink">
                          {formatDateTimeVN(sla.promisedAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thực tế</span>
                        <span className="tabular-nums text-ink">
                          {sla.actualAt ? formatDateTimeVN(sla.actualAt) : 'Chưa giao'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Kết luận</span>
                        <StatusLabel tone={sla.satisfied ? 'success' : 'danger'}>
                          {sla.satisfied ? 'Đạt SLA' : 'Vi phạm SLA'}
                        </StatusLabel>
                      </div>
                      {sla.reason ? (
                        <p className="border-l-2 border-line-strong pl-2 text-[11px] text-ink-faint">
                          {sla.reason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyNote>Chưa có dữ liệu SLA cho đơn này.</EmptyNote>
                  )}
                </EditorialSection>
              </div>
            </div>
          </>
        ) : null}
      </DataState>

      <Modal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Đổi lịch giao hàng"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRescheduleOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitReschedule} isLoading={busy}>
              Lưu lịch mới
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Thời gian hẹn mới"
            type="datetime-local"
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
          />
          <Input
            label="Lý do"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Khách yêu cầu giao buổi chiều"
          />
          <p className="text-[11px] text-ink-faint">
            Lịch mới được ghi vào dòng thời gian của đơn và dùng lại cho tính SLA.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={partialOpen}
        onClose={() => setPartialOpen(false)}
        title="Phân đơn giao một phần"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPartialOpen(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={submitPartial} isLoading={busy}>
              Tạo đơn phân chia
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[12px] leading-6 text-ink-soft">
            Chỉ đơn đang soạn hoặc đã đóng gói mới phân chia được. Đơn gốc giữ nguyên mã vận đơn,
            đơn phân chia nhận mã riêng để giao phần còn lại.
          </p>
          <Input
            label="Ghi chú"
            value={partialNote}
            onChange={(event) => setPartialNote(event.target.value)}
            placeholder="Thiếu 1 kiện, giao bổ sung hôm sau"
          />
        </div>
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
