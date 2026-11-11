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
import { Button, DataState, Input, Modal, Pagination, Select, TableState } from 'ui-components';
import type { Geofence, SosAlert } from '@/lib/mock';
import { formatNumber } from '@/lib/labels';
import MapCanvas from '@/components/demo/MapCanvas';
import type { LatLng, MapMarker, MapPolygon, MapPolyline, MapVehicle } from '@/components/demo/MapCanvas';

const PAGE_SIZE = 12;

const KIND_LABELS: Record<Geofence['kind'], string> = {
  SAFE: 'Vùng an toàn',
  RESTRICTED: 'Vùng hạn chế',
};

const KIND_TONES: Record<Geofence['kind'], 'success' | 'warning'> = {
  SAFE: 'success',
  RESTRICTED: 'warning',
};

function circleToPolygon(centerLat: number, centerLng: number, radiusM: number): LatLng[] {
  const points: LatLng[] = [];
  const latDelta = radiusM / 111_320;
  const lngDelta = radiusM / (111_320 * Math.cos((centerLat * Math.PI) / 180) || 1);
  for (let step = 0; step < 30; step += 1) {
    const angle = (step / 30) * Math.PI * 2;
    points.push([centerLat + Math.cos(angle) * latDelta, centerLng + Math.sin(angle) * lngDelta]);
  }
  return points;
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<Geofence['kind'] | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    kind: 'SAFE' as Geofence['kind'],
    province: '',
    centerLat: '',
    centerLng: '',
    radiusM: '',
    note: '',
  });

  const [simulating, setSimulating] = useState(false);
  const [breachNotice, setBreachNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, alertRows] = await Promise.all([
        data.geofences.list(),
        data.sosAlerts.list(),
      ]);
      setGeofences(rows);
      setAlerts(alertRows);
      setSelectedId((current) => current || rows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu địa danh.');
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedGeofences = useMemo(() => {
    const rows = geofences.slice();
    const term = filter.toLowerCase().trim();
    const filtered = kindFilter === 'ALL' ? rows : rows.filter((g) => g.kind === kindFilter);
    if (term) {
      return filtered.filter(
        (g) => g.name.toLowerCase().includes(term) || g.province.toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [geofences, filter, kindFilter]);

  const paged = useMemo(
    () => sortedGeofences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedGeofences, page],
  );
  const totalPages = Math.max(1, Math.ceil(sortedGeofences.length / PAGE_SIZE));

  const selected = useMemo(
    () => geofences.find((geofence) => geofence.id === selectedId) ?? null,
    [geofences, selectedId],
  );

  /** Kiểm tra dữ liệu nhập trước khi ghi vào một vùng địa danh. */
  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Nhập tên vùng kiểm soát.';
    if (!form.kind) errors.kind = 'Chọn loại vùng an toàn hoặc hạn chế.';
    if (!form.province.trim()) errors.province = 'Nhập tỉnh/thành phố quản lý.';

    const lat = Number(form.centerLat);
    if (!form.centerLat.trim()) {
      errors.centerLat = 'Nhập vĩ độ.';
    } else if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.centerLat = 'Vĩ độ phải trong khoảng -90,0 đến 90,0.';
    }

    const lng = Number(form.centerLng);
    if (!form.centerLng.trim()) {
      errors.centerLng = 'Nhập kinh độ.';
    } else if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.centerLng = 'Kinh độ phải trong khoảng -180,0 đến 180,0.';
    }

    const radius = Number(form.radiusM);
    if (!form.radiusM.trim()) {
      errors.radiusM = 'Nhập bán kính tính bằng mét.';
    } else if (!Number.isFinite(radius) || radius <= 0 || radius > 50_000) {
      errors.radiusM = 'Bán kính phải lớn hơn 0 (tối đa 50.000m).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /** Xoá lỗi của trường vừa chỉnh sửa. */
  const clearError = (field: string) =>
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const metrics: EditorialMetric[] = [
    {
      label: 'Đang hoạt động',
      value: String(geofences.filter((g) => g.active).length),
      meta: 'vùng kích hoạt',
    },
    { label: 'Tắt', value: String(geofences.filter((g) => !g.active).length), meta: 'tạm ngưng' },
    {
      label: 'Cảnh báo 24h',
      value: String(geofences.reduce((sum, g) => sum + g.alerts24h, 0)),
      meta: 'lần xâm nhập',
      tone: 'warning',
    },
    {
      label: 'Vùng hạn chế',
      value: String(geofences.filter((g) => g.kind === 'RESTRICTED').length),
      meta: 'chặn dừng đỗ',
    },
  ];

  const polygons = useMemo<MapPolygon[]>(
    () =>
      geofences
        .filter((fence) => fence.active)
        .map((fence) => ({
          id: fence.id,
          points: circleToPolygon(fence.centerLat, fence.centerLng, fence.radiusM),
          label: fence.name,
          color:
            fence.id === selectedId
              ? '#2f4a3c'
              : fence.kind === 'RESTRICTED'
                ? '#a3483f'
                : '#4c6570',
        })),
    [geofences, selectedId],
  );

  /** Lộ trình mô phỏng đi xuyên qua vùng đang chọn. */
  const simulation = useMemo(() => {
    if (!selected) return null;
    const latDelta = selected.radiusM / 111_320;
    const lngDelta =
      selected.radiusM / (111_320 * Math.cos((selected.centerLat * Math.PI) / 180) || 1);
    const route: LatLng[] = [
      [selected.centerLat + latDelta * 2.6, selected.centerLng - lngDelta * 2.6],
      [selected.centerLat + latDelta * 1.2, selected.centerLng - lngDelta * 1.1],
      [selected.centerLat + latDelta * 0.1, selected.centerLng + lngDelta * 0.1],
      [selected.centerLat - latDelta * 1.3, selected.centerLng + lngDelta * 1.4],
      [selected.centerLat - latDelta * 2.4, selected.centerLng + lngDelta * 2.6],
    ];
    return route;
  }, [selected]);

  const markers = useMemo<MapMarker[]>(() => {
    if (!selected) return [];
    return [
      {
        id: selected.id,
        lat: selected.centerLat,
        lng: selected.centerLng,
        label: `${selected.name} · ${formatNumber(selected.radiusM)} m`,
        kind: selected.kind === 'RESTRICTED' ? 'sos' : 'warehouse',
        tone: selected.kind === 'RESTRICTED' ? 'danger' : 'info',
      },
    ];
  }, [selected]);

  const polylines = useMemo<MapPolyline[]>(() => {
    if (!simulation) return [];
    return [{ id: 'sim', points: simulation, color: '#4c6570', width: 3, dashed: true }];
  }, [simulation]);

  const vehicles = useMemo<MapVehicle[]>(() => {
    if (!simulation) return [];
    return [{ id: 'sim-vehicle', label: 'Xe mô phỏng', route: simulation, tone: 'info' }];
  }, [simulation]);

  const simulateBreach = async () => {
    if (!selected) return;
    setSimulating(true);
    setBreachNotice('');
    try {
      await data.sosAlerts.create({
        code: `SOS-${Date.now().toString().slice(-6)}`,
        driverName: 'Nguyễn Văn Tài',
        tripCode: 'TRP-MÔPHỎNG',
        kind: 'GEOFENCE_BREACH',
        severity: selected.kind === 'RESTRICTED' ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        lat: selected.centerLat,
        lng: selected.centerLng,
        createdAt: new Date().toISOString(),
        note: `Xe đi vào ${selected.kind === 'RESTRICTED' ? 'vùng hạn chế' : 'vùng an toàn'} ${selected.name} (mô phỏng ST_Contains).`,
      });
      await data.geofences.update(selected.id, { alerts24h: selected.alerts24h + 1 });
      setBreachNotice(
        `Đã tạo cảnh báo SOS cho vùng ${selected.name}. Xem tại trang Cảnh báo SOS.`,
      );
      await load();
    } catch (err) {
      setBreachNotice(err instanceof Error ? err.message : 'Không tạo được cảnh báo.');
    } finally {
      setSimulating(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await data.geofences.update(editingId, {
          name: form.name,
          kind: form.kind,
          province: form.province,
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
          radiusM: Number(form.radiusM),
          note: form.note,
        });
        setGeofences((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        await data.geofences.create({
          name: form.name,
          kind: form.kind,
          province: form.province,
          centerLat: Number(form.centerLat),
          centerLng: Number(form.centerLng),
          radiusM: Number(form.radiusM),
          note: form.note,
          active: true,
          alerts24h: 0,
        });
      }
      setForm({
        name: '',
        kind: 'SAFE',
        province: '',
        centerLat: '',
        centerLng: '',
        radiusM: '',
        note: '',
      });
      setModalOpen(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được địa danh.');
      setFormErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (geofence: Geofence) => {
    try {
      const updated = await data.geofences.update(geofence.id, { active: !geofence.active });
      setGeofences((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.');
    }
  };

  const openEdit = (geofence: Geofence) => {
    setForm({
      name: geofence.name,
      kind: geofence.kind,
      province: geofence.province,
      centerLat: String(geofence.centerLat),
      centerLng: String(geofence.centerLng),
      radiusM: String(geofence.radiusM),
      note: geofence.note ?? '',
    });
    setEditingId(geofence.id);
    setModalOpen(true);
  };

  const openCreate = () => {
    setForm({
      name: '',
      kind: 'SAFE',
      province: '',
      centerLat: '',
      centerLng: '',
      radiusM: '',
      note: '',
    });
    setEditingId(null);
    setModalOpen(true);
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="GPS · Ch. 14"
        title="Geofencing & vùng an toàn"
        description="Vẽ vùng an toàn / hạn chế trên bản đồ, mô phỏng xe đi vào vùng để thấy cảnh báo SOS được tạo tự động — mô phỏng truy vấn không gian ST_Contains của PostGIS."
        meta={`${geofences.length} vùng`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              Làm mới
            </Button>
            <Button size="sm" onClick={openCreate}>
              Tạo vùng
            </Button>
          </div>
        }
      />

      {error ? (
        <p className="border-l-2 border-danger py-1 pl-3 text-[12px] text-danger">{error}</p>
      ) : null}

      <MetricBand metrics={metrics} />

      <EditorialSection
        title="Bản đồ vùng kiểm soát"
        eyebrow="Mô phỏng xâm nhập"
        action={
          <div className="flex items-center gap-2">
            <div className="w-64">
              <Select
                aria-label="Chọn vùng để mô phỏng"
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setBreachNotice('');
                }}
                options={geofences.map((fence) => ({
                  value: fence.id,
                  label: `${fence.name} · ${KIND_LABELS[fence.kind]}`,
                }))}
              />
            </div>
            <Button
              size="sm"
              onClick={simulateBreach}
              isLoading={simulating}
              disabled={!selected}
            >
              Mô phỏng xe xâm nhập
            </Button>
          </div>
        }
      >
        <DataState loading={loading} empty={!loading && geofences.length === 0} error={error} onRetry={load}>
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div>
              <MapCanvas
                height={460}
                polygons={polygons}
                markers={markers}
                polylines={polylines}
                vehicles={vehicles}
                animate
                ariaLabel="Bản đồ vùng geofence và xe mô phỏng"
              />
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-faint">
                <span>▢ Vùng an toàn</span>
                <span style={{ color: '#a3483f' }}>▢ Vùng hạn chế</span>
                <span>— Lộ trình mô phỏng</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-line p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                  Vùng đang chọn
                </div>
                {selected ? (
                  <div className="mt-2 space-y-1.5 text-[12px] text-ink-soft">
                    <div className="font-semibold text-ink">{selected.name}</div>
                    <div className="flex justify-between">
                      <span>Loại</span>
                      <StatusLabel tone={KIND_TONES[selected.kind]}>
                        {KIND_LABELS[selected.kind]}
                      </StatusLabel>
                    </div>
                    <div className="flex justify-between">
                      <span>Tỉnh</span>
                      <span className="text-ink">{selected.province}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bán kính</span>
                      <span className="tabular-nums text-ink">{formatNumber(selected.radiusM)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cảnh báo 24h</span>
                      <span className="tabular-nums text-ink">{selected.alerts24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trạng thái</span>
                      <StatusLabel tone={selected.active ? 'success' : 'neutral'}>
                        {selected.active ? 'Đang kích hoạt' : 'Tạm ngưng'}
                      </StatusLabel>
                    </div>
                  </div>
                ) : (
                  <EmptyNote>Chọn một vùng để xem chi tiết.</EmptyNote>
                )}
              </div>

              <div className="border border-line p-3 text-[12px] text-ink-soft">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                  Cảnh báo gần nhất
                </div>
                {alerts.filter((alert) => alert.kind === 'GEOFENCE_BREACH').length === 0 ? (
                  <p className="mt-2 text-ink-faint">Chưa có cảnh báo xâm nhập.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {alerts
                      .filter((alert) => alert.kind === 'GEOFENCE_BREACH')
                      .slice(0, 4)
                      .map((alert) => (
                        <li key={alert.id} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px]">{alert.note}</span>
                          <StatusLabel tone={alert.status === 'OPEN' ? 'danger' : 'neutral'}>
                            {alert.status === 'OPEN' ? 'Mở' : alert.status}
                          </StatusLabel>
                        </li>
                      ))}
                  </ul>
                )}
                {breachNotice ? (
                  <p className="mt-2 border-l-2 border-accent pl-2 text-[11px] text-ink">
                    {breachNotice}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </DataState>
      </EditorialSection>

      <EditorialSection title="Danh sách địa danh" eyebrow="Quản lý">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="search"
            placeholder="Tìm tên vùng, tỉnh"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
            className="w-64 h-9"
          />
          <Select
            className="h-9 min-w-[14rem]"
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as Geofence['kind'] | 'ALL')}
            options={[
              { value: 'ALL', label: 'Tất cả loại' },
              { value: 'SAFE', label: KIND_LABELS.SAFE },
              { value: 'RESTRICTED', label: KIND_LABELS.RESTRICTED },
            ]}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilter('');
              setKindFilter('ALL');
            }}
          >
            Xóa bộ lọc
          </Button>
        </div>
        <div className="overflow-hidden border border-line">
          <table className="min-w-full divide-y divide-line text-[13px]">
            <thead className="bg-surface-alt">
              <tr>
                {['Tên vùng', 'Loại', 'Tỉnh', 'Bán kính', 'Cảnh báo 24h', 'Trạng thái', ''].map(
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
            <tbody className="divide-y divide-line">
              <TableState
                loading={loading}
                empty={!loading && paged.length === 0}
                onRetry={load}
                colSpan={7}
                emptyContent={
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-ink-faint">
                      Không tìm thấy địa danh.
                    </td>
                  </tr>
                }
                error={error ? new Error(error) : undefined}
              >
                {paged.map((geofence) => (
                  <tr
                    key={geofence.id}
                    className={`cursor-pointer hover:bg-surface-alt ${
                      geofence.id === selectedId ? 'bg-accent-soft/40' : ''
                    }`}
                    onClick={() => setSelectedId(geofence.id)}
                  >
                    <td className="px-3 py-2 font-medium text-ink">{geofence.name}</td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={KIND_TONES[geofence.kind]}>
                        {KIND_LABELS[geofence.kind]}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2 text-ink-faint">{geofence.province}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(geofence.radiusM)} m</td>
                    <td className="px-3 py-2 tabular-nums">
                      {geofence.alerts24h > 0 ? (
                        <StatusLabel tone="warning">{geofence.alerts24h}</StatusLabel>
                      ) : (
                        <StatusLabel tone="neutral">{0}</StatusLabel>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={geofence.active ? 'success' : 'neutral'}>
                        {geofence.active ? 'Đang kích hoạt' : 'Tạm ngưng'}
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(geofence);
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-ink-soft hover:text-accent"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleActive(geofence);
                          }}
                        >
                          {geofence.active ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
        <div className="flex justify-center py-3">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </EditorialSection>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Sửa địa danh' : 'Tạo địa danh'}
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="Tên vùng"
            required
            value={form.name}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }));
              clearError('name');
            }}
            placeholder="VD: KCN Sóng Thần"
            error={formErrors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Loại"
              value={form.kind}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, kind: event.target.value as Geofence['kind'] }));
                clearError('kind');
              }}
              options={[
                { value: 'SAFE', label: KIND_LABELS.SAFE },
                { value: 'RESTRICTED', label: KIND_LABELS.RESTRICTED },
              ]}
              error={formErrors.kind}
            />
            <Input
              label="Tỉnh"
              required
              value={form.province}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, province: event.target.value }));
                clearError('province');
              }}
              placeholder="VD: Bình Dương"
              error={formErrors.province}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Vĩ độ"
              required
              type="number"
              step="0.000001"
              value={form.centerLat}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, centerLat: event.target.value }));
                clearError('centerLat');
              }}
              placeholder="10.9239"
              error={formErrors.centerLat}
            />
            <Input
              label="Kinh độ"
              required
              type="number"
              step="0.000001"
              value={form.centerLng}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, centerLng: event.target.value }));
                clearError('centerLng');
              }}
              placeholder="106.7147"
              error={formErrors.centerLng}
            />
            <Input
              label="Bán kính (m)"
              required
              type="number"
              value={form.radiusM}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, radiusM: event.target.value }));
                clearError('radiusM');
              }}
              placeholder="2400"
              error={formErrors.radiusM}
            />
          </div>
          <Input
            label="Ghi chú"
            value={form.note}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, note: event.target.value }));
              clearError('note');
            }}
            placeholder="Không bắt buộc"
            error={formErrors.note}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              {editingId ? 'Lưu' : 'Tạo'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
