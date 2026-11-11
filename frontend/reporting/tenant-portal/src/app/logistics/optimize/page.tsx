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
import { Button, DataState, Select } from 'ui-components';
import type { Order, Trip, TripStop, Vehicle } from '@/lib/mock';
import { tripStatusLabel, tripStatusTone, formatNumber, formatDateTimeVN } from '@/lib/labels';
import MapCanvas from '@/components/demo/MapCanvas';
import type { LatLng, MapMarker, MapPolyline } from '@/components/demo/MapCanvas';

type OptimizedPlan = {
  order: TripStop[];
  originalKm: number;
  optimizedKm: number;
  originalMinutes: number;
  optimizedMinutes: number;
  savedKm: number;
  savedPercent: number;
  totalWeightKg: number;
  capacityKg: number;
  overloaded: boolean;
};

const ROAD_FACTOR = 1.28;
const AVERAGE_SPEED_KMH = 32;

function haversineKm(a: LatLng, b: LatLng): number {
  const [aLat, aLng] = a;
  const [bLat, bLng] = b;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routeDistance(stops: TripStop[]): number {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let index = 1; index < stops.length; index += 1) {
    total += haversineKm(
      [stops[index - 1].lat, stops[index - 1].lng],
      [stops[index].lat, stops[index].lng],
    );
  }
  return total * ROAD_FACTOR;
}

/** Thuật toán láng giềng gần nhất: mô phỏng bước tối ưu CVRP ở BE. */
function nearestNeighbour(stops: TripStop[]): TripStop[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops.slice(1)];
  const ordered: TripStop[] = [stops[0]];
  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const distance = haversineKm(
        [current.lat, current.lng],
        [candidate.lat, candidate.lng],
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

function computePlan(trip: Trip, vehicle: Vehicle | undefined, orders: Order[]): OptimizedPlan {
  const originalKm = routeDistance(trip.stops);
  const order = nearestNeighbour(trip.stops);
  const optimizedKm = routeDistance(order);
  const originalMinutes = Math.round((originalKm / AVERAGE_SPEED_KMH) * 60);
  const optimizedMinutes = Math.round((optimizedKm / AVERAGE_SPEED_KMH) * 60);
  const savedKm = Math.max(0, originalKm - optimizedKm);
  const savedPercent = originalKm > 0 ? Math.round((savedKm / originalKm) * 100) : 0;
  const totalWeightKg = order.reduce((sum, stop) => {
    const matching = orders.find((row) => row.trackingCode === stop.orderTrackingCode);
    return sum + (matching?.weightKg ?? 0);
  }, 0);
  const capacityKg = vehicle?.capacityKg ?? 0;
  return {
    order,
    originalKm,
    optimizedKm,
    originalMinutes,
    optimizedMinutes,
    savedKm,
    savedPercent,
    totalWeightKg,
    capacityKg,
    overloaded: capacityKg > 0 && totalWeightKg > capacityKg,
  };
}

export default function RouteOptimizePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tripRows, vehicleRows, orderRows] = await Promise.all([
        data.trips.list(),
        data.vehicles.list(),
        data.orders.list(),
      ]);
      setTrips(tripRows);
      setVehicles(vehicleRows);
      setOrders(orderRows);
      setSelectedId((current) => current || tripRows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu chuyến.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? null,
    [trips, selectedId],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedTrip?.vehicleId),
    [vehicles, selectedTrip],
  );
  const plan = useMemo(
    () => (selectedTrip ? computePlan(selectedTrip, selectedVehicle, orders) : null),
    [selectedTrip, selectedVehicle, orders],
  );

  const markers = useMemo<MapMarker[]>(() => {
    if (!plan) return [];
    return plan.order.map((stop) => ({
      id: stop.id,
      lat: stop.lat,
      lng: stop.lng,
      label: `${stop.customerName}`,
      kind: 'dropoff',
      tone: 'accent',
    }));
  }, [plan]);

  const polylines = useMemo<MapPolyline[]>(() => {
    if (!selectedTrip) return [];
    return [
      {
        id: 'original',
        points: selectedTrip.stops.map((stop) => [stop.lat, stop.lng] as LatLng),
        color: '#8a8174',
        dashed: true,
        width: 2,
      },
      {
        id: 'optimized',
        points: (plan?.order ?? selectedTrip.stops).map(
          (stop) => [stop.lat, stop.lng] as LatLng,
        ),
        color: '#2f4a3c',
        width: 3.5,
      },
    ];
  }, [selectedTrip, plan]);

  const apply = async () => {
    if (!selectedTrip) return;
    setApplying(true);
    setNotice('');
    try {
      await data.trips.optimize(selectedTrip.id);
      setNotice(`Đã áp dụng lộ trình tối ưu cho chuyến ${selectedTrip.code}.`);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không áp dụng được tối ưu.');
    } finally {
      setApplying(false);
    }
  };

  const metrics: EditorialMetric[] = plan
    ? [
        {
          label: 'Quãng đường gốc',
          value: `${formatNumber(Math.round(plan.originalKm))} km`,
          meta: `~${plan.originalMinutes} phút`,
        },
        {
          label: 'Sau tối ưu',
          value: `${formatNumber(Math.round(plan.optimizedKm))} km`,
          meta: `~${plan.optimizedMinutes} phút`,
          tone: 'success',
        },
        {
          label: 'Tiết kiệm',
          value: `${plan.savedPercent}%`,
          meta: `${formatNumber(Math.round(plan.savedKm))} km`,
          tone: plan.savedPercent > 0 ? 'success' : 'default',
        },
        {
          label: 'Tải trọng',
          value: `${formatNumber(Math.round(plan.totalWeightKg))} kg`,
          meta: plan.capacityKg ? `Xe ${formatNumber(plan.capacityKg)} kg` : 'Chưa gán xe',
          tone: plan.overloaded ? 'danger' : 'default',
        },
      ]
    : [];

  return (
    <>
      <EditorialPageHeader
        eyebrow="TMS · Ch. 12"
        title="Tối ưu lộ trình CVRP"
        description="Mô phỏng bước giải bài toán định tuyến đa điểm: sắp xếp lại thứ tự giao theo khoảng cách gần nhất, so sánh quãng đường và kiểm tra ràng buộc tải trọng xe."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-64">
              <Select
                aria-label="Chọn chuyến"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setNotice('');
                }}
                options={trips.map((trip) => ({
                  value: trip.id,
                  label: `${trip.code} · ${trip.stops.length} điểm`,
                }))}
              />
            </div>
            <Button size="sm" onClick={apply} isLoading={applying} disabled={!selectedTrip || !plan || plan.savedKm <= 0}>
              Áp dụng tối ưu
            </Button>
          </div>
        }
      />

      <DataState loading={loading} empty={!loading && trips.length === 0} error={error} onRetry={load}>
        {selectedTrip && plan ? (
          <>
            <MetricBand metrics={metrics} />

            {notice ? (
              <div className="mb-4 border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
                {notice}
              </div>
            ) : null}

            <EditorialSection
              title="So sánh lộ trình"
              eyebrow={`Chuyến ${selectedTrip.code}`}
              action={
                <div className="flex items-center gap-2 text-[11px] text-ink-faint">
                  <span
                    className="inline-block h-0.5 w-6"
                    style={{ background: '#8a8174', borderTop: '2px dashed #8a8174' }}
                  />
                  Gốc
                  <span className="ml-2 inline-block h-0.5 w-6 bg-accent" />
                  Tối ưu
                </div>
              }
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <MapCanvas
                  height={460}
                  markers={markers}
                  polylines={polylines}
                  ariaLabel="Bản đồ so sánh lộ trình trước và sau tối ưu"
                />

                <div className="space-y-4">
                  <div className="border border-line p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                      Thông tin chuyến
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12px] text-ink-soft">
                      <div className="flex justify-between">
                        <span>Tài xế</span>
                        <span className="font-medium text-ink">{selectedTrip.driverName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Biển số</span>
                        <span className="font-mono text-ink">{selectedTrip.vehiclePlate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trạng thái</span>
                        <StatusLabel tone={tripStatusTone(selectedTrip.status)}>
                          {tripStatusLabel(selectedTrip.status)}
                        </StatusLabel>
                      </div>
                      <div className="flex justify-between">
                        <span>Điểm giao</span>
                        <span className="tabular-nums text-ink">{selectedTrip.stops.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tối ưu trước đó</span>
                        <span>{selectedTrip.optimized ? 'Có' : 'Chưa'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-line p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                      Ràng buộc tải trọng
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, plan.capacityKg ? (plan.totalWeightKg / plan.capacityKg) * 100 : 0)}%`,
                          background: plan.overloaded ? '#a3483f' : '#3f6b4f',
                        }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-ink-faint tabular-nums">
                      <span>{formatNumber(Math.round(plan.totalWeightKg))} kg</span>
                      <span>{plan.capacityKg ? `${formatNumber(plan.capacityKg)} kg` : '—'}</span>
                    </div>
                    {plan.overloaded ? (
                      <p className="mt-2 text-[11px] text-danger">
                        Vượt tải trọng xe — cần tách chuyến hoặc đổi xe lớn hơn.
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-ink-faint">
                        Nằm trong giới hạn tải trọng của phương tiện.
                      </p>
                    )}
                  </div>

                  <div className="border border-line p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                      Thứ tự giao tối ưu
                    </div>
                    <ol className="mt-2 space-y-1 text-[12px] text-ink-soft">
                      {plan.order.map((stop, index) => (
                        <li key={stop.id} className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-[10px] tabular-nums">
                            {index + 1}
                          </span>
                          <span>
                            <span className="font-medium text-ink">{stop.customerName}</span>
                            <span className="text-ink-faint"> · {stop.district}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </EditorialSection>

            <EditorialSection title="Cách tính" eyebrow="Mô phỏng phía client">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">1. Khoảng cách</div>
                  <p className="mt-1">Haversine × 1,28 hệ số đường bộ giữa các điểm giao.</p>
                </div>
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">2. Thứ tự</div>
                  <p className="mt-1">Láng giềng gần nhất từ điểm đầu — xấp xỉ bước CVRP ở BE.</p>
                </div>
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">3. Thời gian</div>
                  <p className="mt-1">Quãng đường chia vận tốc trung bình 32 km/h.</p>
                </div>
              </div>
            </EditorialSection>
          </>
        ) : (
          <EmptyNote>Chưa có chuyến để tối ưu.</EmptyNote>
        )}
      </DataState>
    </>
  );
}
