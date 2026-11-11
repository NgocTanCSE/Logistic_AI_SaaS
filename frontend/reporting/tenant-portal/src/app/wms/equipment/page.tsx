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
import { Button, Input, Select, TableState } from 'ui-components';
import type { Equipment } from '@/lib/mock';
import {
  equipmentStatusLabel,
  equipmentStatusTone,
  formatDateTimeVN,
  formatNumber,
} from '@/lib/labels';

const TYPE_LABELS: Record<Equipment['type'], string> = {
  SCANNER: 'Máy quét',
  LABEL_PRINTER: 'Máy in nhãn',
  SCALE: 'Cân điện tử',
  FORKLIFT: 'Xe nâng',
  PDA: 'PDA cầm tay',
  CAMERA: 'Camera',
};

function batteryTone(value: number | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === null) return 'neutral';
  if (value < 20) return 'danger';
  if (value < 50) return 'warning';
  return 'success';
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<Equipment['type'] | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<Equipment['status'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await data.equipment.list();
      setEquipment(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách thiết bị.');
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return equipment
      .filter((row) => typeFilter === 'ALL' || row.type === typeFilter)
      .filter((row) => statusFilter === 'ALL' || row.status === statusFilter)
      .filter((row) => {
        if (!term) return true;
        return (
          row.code.toLowerCase().includes(term) ||
          row.name.toLowerCase().includes(term) ||
          row.warehouseCode.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [equipment, typeFilter, statusFilter, search]);

  const online = equipment.filter((row) => row.status === 'ONLINE').length;
  const maintenance = equipment.filter((row) => row.status === 'MAINTENANCE').length;
  const offline = equipment.filter((row) => row.status === 'OFFLINE').length;
  const lowBattery = equipment.filter(
    (row) => row.batteryPct !== null && row.batteryPct < 20,
  ).length;

  const metrics: EditorialMetric[] = [
    {
      label: 'Hoạt động',
      value: formatNumber(online),
      meta: `${equipment.length} thiết bị`,
      tone: 'success',
    },
    {
      label: 'Bảo trì',
      value: formatNumber(maintenance),
      meta: 'Không dùng để soạn hàng',
      tone: maintenance > 0 ? 'warning' : 'default',
    },
    {
      label: 'Mất kết nối',
      value: formatNumber(offline),
      meta: 'Cần kiểm tra wifi/sạc',
      tone: offline > 0 ? 'danger' : 'default',
    },
    {
      label: 'Pin yếu',
      value: formatNumber(lowBattery),
      meta: 'Dưới 20%',
      tone: lowBattery > 0 ? 'warning' : 'success',
    },
  ];

  const setStatus = async (row: Equipment, status: Equipment['status']) => {
    setBusyId(row.id);
    setNotice('');
    try {
      await data.equipment.update(row.id, {
        status,
        lastSeenAt:
          status === 'ONLINE' ? new Date().toISOString() : row.lastSeenAt,
      });
      setNotice(
        `Thiết bị ${row.code} → ${equipmentStatusLabel(status).toLowerCase()}.`,
      );
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không cập nhật được thiết bị.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Thiết bị"
        title="Thiết bị kho"
        description="Máy quét, PDA, cân và xe nâng theo từng kho. Thiết bị đang bảo trì bị loại khỏi danh sách phân công soạn hàng để tránh gián đoạn ca."
        meta={`${filtered.length} / ${equipment.length} thiết bị`}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Làm mới
          </Button>
        }
      />

      <MetricBand metrics={metrics} />

      {notice ? (
        <div className="border-l-2 border-accent bg-surface px-3 py-2 text-[12px] text-ink">
          {notice}
        </div>
      ) : null}

      <EditorialSection
        title="Danh sách thiết bị"
        eyebrow="Theo kho"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc theo loại thiết bị"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as Equipment['type'] | 'ALL')
                }
                options={[
                  { value: 'ALL', label: 'Mọi loại' },
                  ...(Object.keys(TYPE_LABELS) as Equipment['type'][]).map((type) => ({
                    value: type,
                    label: TYPE_LABELS[type],
                  })),
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc theo trạng thái thiết bị"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as Equipment['status'] | 'ALL')
                }
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...(['ONLINE', 'OFFLINE', 'MAINTENANCE'] as Equipment['status'][]).map(
                    (status) => ({ value: status, label: equipmentStatusLabel(status) }),
                  ),
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="mb-3">
          <Input
            type="search"
            placeholder="Tìm mã, tên thiết bị, kho"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-72"
          />
        </div>

        <div className="overflow-x-auto border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-alt">
              <tr>
                {['Mã', 'Thiết bị', 'Loại', 'Kho', 'Pin', 'Lần cuối online', 'Trạng thái', ''].map(
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
                colSpan={8}
                emptyTitle="Không có thiết bị"
                emptyDescription="Đổi bộ lọc hoặc thêm thiết bị cho kho."
              >
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-alt">
                    <td className="px-3 py-2 font-mono text-[11px] font-medium text-ink">
                      {row.code}
                    </td>
                    <td className="px-3 py-2 text-ink-soft">{row.name}</td>
                    <td className="px-3 py-2 text-ink-soft">{TYPE_LABELS[row.type]}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                      {row.warehouseCode}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.batteryPct === null ? (
                        <span className="text-ink-faint">Nguồn điện</span>
                      ) : (
                        <StatusLabel tone={batteryTone(row.batteryPct)}>
                          {row.batteryPct}%
                        </StatusLabel>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-faint">
                      {formatDateTimeVN(row.lastSeenAt)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusLabel tone={equipmentStatusTone(row.status)}>
                        {equipmentStatusLabel(row.status)}
                      </StatusLabel>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        {row.status !== 'ONLINE' ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="font-semibold text-ink-soft hover:text-accent disabled:opacity-50"
                            onClick={() => setStatus(row, 'ONLINE')}
                          >
                            Kích hoạt
                          </button>
                        ) : null}
                        {row.status !== 'MAINTENANCE' ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="font-semibold text-ink-soft hover:text-accent disabled:opacity-50"
                            onClick={() => setStatus(row, 'MAINTENANCE')}
                          >
                            Bảo trì
                          </button>
                        ) : null}
                        {row.status !== 'OFFLINE' ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="font-semibold text-danger hover:underline disabled:opacity-50"
                            onClick={() => setStatus(row, 'OFFLINE')}
                          >
                            Ngắt
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </TableState>
            </tbody>
          </table>
        </div>
      </EditorialSection>

      <EditorialSection title="Tình trạng theo kho" eyebrow="Tổng hợp">
        {equipment.length === 0 ? (
          <EmptyNote>Chưa có thiết bị nào được khai báo.</EmptyNote>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {Array.from(new Set(equipment.map((row) => row.warehouseCode)))
              .sort()
              .map((code) => {
                const rows = equipment.filter((row) => row.warehouseCode === code);
                const on = rows.filter((row) => row.status === 'ONLINE').length;
                return (
                  <div
                    key={code}
                    className="flex flex-wrap items-center justify-between gap-3 py-2 text-[12px]"
                  >
                    <span className="font-mono text-[11px] font-semibold text-ink">{code}</span>
                    <span className="text-ink-soft">
                      {on}/{rows.length} thiết bị sẵn sàng
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${rows.length === 0 ? 0 : (on / rows.length) * 100}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[11px] text-ink-faint">
                        {rows.length === 0 ? 0 : Math.round((on / rows.length) * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </EditorialSection>
    </>
  );
}
