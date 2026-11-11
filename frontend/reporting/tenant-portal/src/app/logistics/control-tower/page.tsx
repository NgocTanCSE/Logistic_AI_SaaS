'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
import type { Driver, Geofence, SosAlert, Trip, Vehicle } from '@/lib/mock';
import {
  sosAlertKindLabel,
  sosAlertSeverityTone,
  sosAlertStatusLabel,
  sosAlertStatusTone,
  tripStatusLabel,
  tripStatusTone,
  formatDateTimeVN,
  formatNumber,
} from '@/lib/labels';
import MapCanvas from '@/components/demo/MapCanvas';
import type { LatLng, MapMarker, MapPolygon, MapVehicle } from '@/components/demo/MapCanvas';

const LINE_TONE: Record<string, string> = {
  PLANNED: '#8a8174',
  DISPATCHED: '#4c6570',
  IN_PROGRESS: '#3f6b4f',
  COMPLETED: '#2f4a3c',
  CANCELLED: '#a3483f',
};

/** Biến geofence tròn thành đa giác để vẽ trên SVG. */
function circleToPolygon(centerLat: number, centerLng: number, radiusM: number): LatLng[] {
  const points: LatLng[] = [];
  const latDelta = radiusM / 111_320;
  const lngDelta = radiusM / (111_320 * Math.cos((centerLat * Math.PI) / 180) || 1);
  for (let step = 0; step < 28; step += 1) {
    const angle = (step / 28) * Math.PI * 2;
    points.push([
      centerLat + Math.cos(angle) * latDelta,
      centerLng + Math.sin(angle) * lngDelta,
    ]);
  }
  return points;
}

export default function ControlTowerPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tripRows, driverRows, vehicleRows, fenceRows, alertRows] = await Promise.all([
        data.trips.list(),
        data.drivers.list(),
        data.vehicles.list(),
        data.geofences.list(),
        data.sosAlerts.list(),
      ]);
      setTrips(tripRows);
      setDrivers(driverRows);
      setVehicles(vehicleRows);
      setGeofences(fenceRows);
      setAlerts(alertRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu điều phối.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const driverById = useMemo(() => new Map(drivers.map((row) => [row.id, row])), [drivers]);
  const vehicleById = useMemo(() => new Map(vehicles.map((row) => [row.id, row])), [vehicles]);

  const visibleTrips = useMemo(() => {
    const source =
      filter === 'ACTIVE'
        ? trips.filter((trip) => trip.status === 'IN_PROGRESS' || trip.status === 'DISPATCHED')
        : trips;
    return [...source].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [trips, filter]);

  const activeTrips = visibleTrips.filter(
    (trip) => trip.status === 'IN_PROGRESS' || trip.status === 'DISPATCHED',
  );

  const markers = useMemo<MapMarker[]>(() => {
    const rows: MapMarker[] = [];
    for (const trip of visibleTrips) {
      for (const stop of trip.stops) {
        rows.push({
          id: `${trip.id}-${stop.id}`,
          lat: stop.lat,
          lng: stop.lng,
          label: stop.orderTrackingCode,
          kind: stop.status === 'DELIVERED' ? 'checkpoint' : 'dropoff',
          tone: stop.status === 'DELIVERED' ? 'neutral' : 'accent',
        });
      }
    }
    return rows;
  }, [visibleTrips]);

  const polylines = useMemo(
    () =>
      visibleTrips
        .filter((trip) => trip.stops.length > 1)
        .map((trip) => ({
          id: trip.id,
          points: trip.stops.map((stop) => [stop.lat, stop.lng] as LatLng),
          color: LINE_TONE[trip.status] || '#2f4a3c',
          dashed: trip.status !== 'IN_PROGRESS',
          width: trip.status === 'IN_PROGRESS' ? 3.5 : 2,
        })),
    [visibleTrips],
  );

  const polygons = useMemo<MapPolygon[]>(
    () =>
      geofences.map((fence) => ({
        id: fence.id,
        points: circleToPolygon(fence.centerLat, fence.centerLng, fence.radiusM),
        label: fence.kind === 'RESTRICTED' ? `Cấm · ${fence.name}` : fence.name,
        color: fence.kind === 'RESTRICTED' ? '#a3483f' : '#4c6570',
      })),
    [geofences],
  );

  const mapVehicles = useMemo<MapVehicle[]>(
    () =>
      activeTrips
        .filter((trip) => trip.stops.length > 1)
        .map((trip) => {
          const driver = driverById.get(trip.driverId);
          const vehicle = vehicleById.get(trip.vehicleId);
          const label = vehicle?.plate || driver?.name || trip.code;
          return {
            id: trip.id,
            label,
            route: trip.stops.map((stop) => [stop.lat, stop.lng] as LatLng),
            tone: trip.status === 'IN_PROGRESS' ? 'info' : 'neutral',
          };
        }),
    [activeTrips, driverById, vehicleById],
  );

  const openAlerts = alerts.filter((alert) => alert.status !== 'RESOLVED');

  const metrics: EditorialMetric[] = [
    { label: 'Chuyến đang chạy', value: String(activeTrips.length), tone: 'default' },
    {
      label: 'Xe di chuyển',
      value: String(mapVehicles.length),
      tone: mapVehicles.length > 0 ? 'success' : 'default',
    },
    {
      label: 'Cảnh báo mở',
      value: String(openAlerts.length),
      tone: openAlerts.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Vùng geofence',
      value: String(geofences.length),
      meta: `${geofences.filter((fence) => fence.kind === 'RESTRICTED').length} vùng cấm`,
    },
  ];

  return (
    <>
      <EditorialPageHeader
        eyebrow="Điều phối · Ch. 15"
        title="Control Tower"
        description="Bản đồ trực tuyến mô phỏng vị trí xe, lộ trình đang chạy, vùng geofence và cảnh báo SOS. Dữ liệu chạy nền mỗi 22 giây một vòng."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRunning((value) => !value)}
            >
              {running ? 'Tạm dừng mô phỏng' : 'Chạy mô phỏng'}
            </Button>
            <Link
              href="/logistics/optimize"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Tối ưu lộ trình
            </Link>
          </div>
        }
      />

      <MetricBand metrics={metrics} />

      <EditorialSection
        title="Bản đồ điều phối"
        eyebrow="Theo dõi trực tuyến"
        action={
          <div className="w-44">
            <Select
              aria-label="Lọc chuyến trên bản đồ"
              value={filter}
              onChange={(event) => setFilter(event.target.value as 'ACTIVE' | 'ALL')}
              options={[
                { value: 'ACTIVE', label: 'Đang chạy' },
                { value: 'ALL', label: 'Tất cả chuyến' },
              ]}
            />
          </div>
        }
      >
        <DataState loading={loading} empty={!loading && visibleTrips.length === 0} error={error} onRetry={load}>
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div>
              <MapCanvas
                height={520}
                markers={markers}
                polylines={polylines}
                polygons={polygons}
                vehicles={mapVehicles}
                animate={running}
                ariaLabel="Bản đồ điều phối trực tuyến"
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-ink-faint">
                <span>● Xe đang chạy</span>
                <span>○ Điểm giao</span>
                <span>▢ Vùng cấm</span>
                <span>— Lộ trình dự kiến</span>
              </div>
            </div>

            <div className="border border-line">
              <div className="border-b border-line px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Tiến độ chuyến
              </div>
              <div className="max-h-[520px] divide-y divide-line overflow-auto">
                {visibleTrips.length === 0 ? (
                  <div className="p-4">
                    <EmptyNote>Chưa có chuyến nào trong bộ lọc này.</EmptyNote>
                  </div>
                ) : (
                  visibleTrips.map((trip) => {
                    const delivered = trip.stops.filter((stop) => stop.status === 'DELIVERED').length;
                    const progress = trip.stops.length
                      ? Math.round((delivered / trip.stops.length) * 100)
                      : 0;
                    const driver = driverById.get(trip.driverId);
                    return (
                      <div key={trip.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px] font-semibold text-ink">{trip.code}</span>
                          <StatusLabel tone={tripStatusTone(trip.status)}>
                            {tripStatusLabel(trip.status)}
                          </StatusLabel>
                        </div>
                        <div className="mt-1 text-[12px] text-ink-soft">
                          {driver?.name || trip.driverName} · {trip.vehiclePlate}
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[11px] text-ink-faint tabular-nums">
                          <span>
                            {delivered}/{trip.stops.length} điểm
                          </span>
                          <span>{progress}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DataState>
      </EditorialSection>

      <EditorialSection
        title="Cảnh báo SOS"
        eyebrow="Geofence & sự cố"
        action={
          <Link
            href="/logistics/sos"
            className="text-[11px] font-semibold text-ink-soft underline-offset-4 hover:text-accent hover:underline"
          >
            Mở trung tâm SOS
          </Link>
        }
      >
        <div className="overflow-hidden border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {['Mã', 'Tài xế', 'Loại', 'Mức độ', 'Trạng thái', 'Thời điểm'].map((label) => (
                  <th
                    key={label}
                    className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[13px]">
              {openAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[12px] text-ink-faint">
                    Không có cảnh báo đang mở.
                  </td>
                </tr>
              ) : (
                openAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-3 py-2 font-mono text-[12px]">{alert.code}</td>
                    <td className="px-3 py-2">{alert.driverName}</td>
                    <td className="px-3 py-2">{sosAlertKindLabel(alert.kind)}</td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={sosAlertSeverityTone(alert.severity)}>
                        {alert.severity}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={sosAlertStatusTone(alert.status)}>
                        {sosAlertStatusLabel(alert.status)}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">
                      {formatDateTimeVN(alert.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection title="Chỉ số đội xe" eyebrow="Tổng hợp">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Tổng chuyến
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">{trips.length}</div>
          </div>
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Đang giao
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {trips.filter((trip) => trip.status === 'IN_PROGRESS').length}
            </div>
          </div>
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Điểm giao hôm nay
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {formatNumber(trips.reduce((sum, trip) => sum + trip.stops.length, 0))}
            </div>
          </div>
          <div className="border border-line p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Tài xế sẵn sàng
            </div>
            <div className="mt-1 font-editorial text-2xl text-ink tabular-nums">
              {drivers.filter((driver) => driver.status === 'AVAILABLE').length}
            </div>
          </div>
        </div>
      </EditorialSection>
    </>
  );
}
