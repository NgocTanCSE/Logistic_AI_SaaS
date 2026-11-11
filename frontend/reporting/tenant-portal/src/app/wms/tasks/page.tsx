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
import { Button, DataState, Input, Modal, Select, TableState } from 'ui-components';
import type { PickTask, Wave } from '@/lib/mock';
import {
  formatNumber,
  pickTaskStatusLabel,
  pickTaskStatusTone,
} from '@/lib/labels';

export default function WmsTasksPage() {
  const [tasks, setTasks] = useState<PickTask[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [waveFilter, setWaveFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<PickTask['status'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const [target, setTarget] = useState<PickTask | null>(null);
  const [quantity, setQuantity] = useState('0');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [taskRows, waveRows] = await Promise.all([
        data.pickTasks.list(),
        data.waves.list(),
      ]);
      setTasks(taskRows);
      setWaves(waveRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tác vụ soạn hàng.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks
      .filter((task) => waveFilter === 'ALL' || task.waveId === waveFilter)
      .filter((task) => statusFilter === 'ALL' || task.status === statusFilter)
      .filter((task) => {
        if (!term) return true;
        return (
          task.sku.toLowerCase().includes(term) ||
          task.productName.toLowerCase().includes(term) ||
          task.orderTrackingCode.toLowerCase().includes(term) ||
          task.binCode.toLowerCase().includes(term)
        );
      })
      .sort((a, b) =>
        a.waveCode === b.waveCode
          ? a.sequence - b.sequence
          : b.waveCode.localeCompare(a.waveCode),
      );
  }, [tasks, waveFilter, statusFilter, search]);

  const pending = tasks.filter((task) => task.status === 'PENDING');
  const short = tasks.filter((task) => task.status === 'SHORT');
  const picked = tasks.filter((task) => task.status === 'PICKED');

  const completion = tasks.length === 0 ? 0 : Math.round((picked.length / tasks.length) * 100);

  const metrics: EditorialMetric[] = [
    {
      label: 'Tổng tác vụ',
      value: formatNumber(tasks.length),
      meta: `${waves.length} wave`,
    },
    {
      label: 'Chờ soạn',
      value: formatNumber(pending.length),
      meta: 'Chưa quét hàng',
      tone: pending.length > 0 ? 'warning' : 'success',
    },
    {
      label: 'Thiếu hàng',
      value: formatNumber(short.length),
      meta: 'Soạn thiếu so với yêu cầu',
      tone: short.length > 0 ? 'danger' : 'default',
    },
    {
      label: 'Hoàn tất',
      value: `${completion}%`,
      meta: `${picked.length}/${tasks.length} tác vụ đã đủ`,
      tone: completion === 100 ? 'success' : 'default',
    },
  ];

  const openConfirm = (task: PickTask) => {
    setTarget(task);
    setQuantity(String(task.quantity));
    setNotice('');
  };

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const updated = await data.pickTasks.confirm(target.id, Number(quantity));
      setNotice(
        updated.status === 'PICKED'
          ? `Đã soạn đủ ${updated.quantity} cho ${updated.orderTrackingCode}.`
          : `Ghi nhận thiếu hàng: ${updated.pickedQuantity}/${updated.quantity} (${updated.sku}).`,
      );
      setTarget(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không xác nhận được tác vụ.');
    } finally {
      setBusy(false);
    }
  };

  const confirmWave = async (wave: Wave) => {
    const waveTasks = tasks.filter(
      (task) => task.waveId === wave.id && task.status === 'PENDING',
    );
    if (waveTasks.length === 0) {
      setNotice(`Wave ${wave.code} không còn tác vụ chờ soạn.`);
      return;
    }
    setBusy(true);
    let done = 0;
    try {
      for (const task of waveTasks) {
        await data.pickTasks.confirm(task.id, task.quantity);
        done += 1;
      }
      setNotice(`Đã xác nhận ${done} tác vụ của wave ${wave.code}.`);
      await load();
    } catch (err) {
      setNotice(
        `Đã xác nhận ${done}/${waveTasks.length} tác vụ: ${
          err instanceof Error ? err.message : 'lỗi không xác định'
        }`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Soạn hàng"
        title="Tác vụ soạn hàng"
        description="Pick task sinh ra từ wave, sắp theo thứ tự đi trong kho. Quét đủ số lượng thì tác vụ đóng; soạn thiếu ghi nhận SHORT để bộ phận mua hàng xử lý."
        meta={`${filtered.length} / ${tasks.length} tác vụ`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/wms/waves"
              className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Về wave picking
            </Link>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              Làm mới
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
        title="Wave cần soạn"
        eyebrow="Theo đợt"
        action={<span className="text-[11px] text-ink-faint">Xác nhận cả wave khi đã lấy đủ</span>}
      >
        {waves.length === 0 ? (
          <EmptyNote>Chưa có wave nào. Tạo wave ở màn hình Wave picking.</EmptyNote>
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {waves.map((wave) => {
              const waveTasks = tasks.filter((task) => task.waveId === wave.id);
              const done = waveTasks.filter((task) => task.status === 'PICKED').length;
              const remaining = waveTasks.filter((task) => task.status === 'PENDING').length;
              return (
                <div
                  key={wave.id}
                  className="grid gap-2 py-2.5 md:grid-cols-[160px_1fr_auto] md:items-center"
                >
                  <div>
                    <div className="font-mono text-[12px] font-semibold text-ink">{wave.code}</div>
                    <div className="text-[11px] text-ink-faint">
                      {wave.warehouseCode} · {wave.strategy}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${waveTasks.length === 0 ? 0 : (done / waveTasks.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-[11px] text-ink-soft">
                      {done}/{waveTasks.length} tác vụ
                    </span>
                    {remaining > 0 ? (
                      <StatusLabel tone="warning">{remaining} chờ soạn</StatusLabel>
                    ) : waveTasks.length > 0 ? (
                      <StatusLabel tone="success">Đã soạn xong</StatusLabel>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busy || remaining === 0}
                    onClick={() => confirmWave(wave)}
                    className="justify-self-start text-[11px] font-semibold text-accent hover:underline disabled:text-ink-faint disabled:no-underline md:justify-self-end"
                  >
                    Xác nhận cả wave
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </EditorialSection>

      <EditorialSection
        title="Danh sách tác vụ"
        eyebrow="Chi tiết"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                className="h-8"
                aria-label="Lọc theo wave"
                value={waveFilter}
                onChange={(event) => setWaveFilter(event.target.value)}
                options={[
                  { value: 'ALL', label: 'Mọi wave' },
                  ...waves.map((wave) => ({ value: wave.id, label: wave.code })),
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                className="h-8"
                aria-label="Lọc theo trạng thái"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as PickTask['status'] | 'ALL')
                }
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...(['PENDING', 'PICKED', 'SHORT', 'SKIPPED'] as PickTask['status'][]).map(
                    (status) => ({ value: status, label: pickTaskStatusLabel(status) }),
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
            placeholder="Tìm SKU, mã đơn, bin"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-72"
          />
        </div>
        <DataState
          loading={loading}
          empty={!loading && filtered.length === 0}
          error={error}
          onRetry={load}
          emptyTitle="Không có tác vụ"
          emptyDescription="Tạo wave để sinh tác vụ soạn hàng."
        >
          <div className="overflow-x-auto border border-line">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-surface-alt">
                <tr>
                  {[
                    'Wave',
                    'Thứ tự',
                    'Đơn',
                    'SKU',
                    'Bin',
                    'Cần',
                    'Đã soạn',
                    'Trạng thái',
                    'Phụ trách',
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
                  colSpan={10}
                  emptyTitle="Không có tác vụ khớp bộ lọc"
                  emptyDescription="Đổi wave hoặc trạng thái để xem tác vụ khác."
                >
                  {filtered.map((task) => (
                    <tr key={task.id} className="hover:bg-surface-alt">
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {task.waveCode}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-faint">{task.sequence}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink">
                        {task.orderTrackingCode}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-[11px] text-ink">{task.sku}</div>
                        <div className="text-[11px] text-ink-faint">{task.productName}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">
                        {task.binCode}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink">{formatNumber(task.quantity)}</td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft">
                        {formatNumber(task.pickedQuantity)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusLabel tone={pickTaskStatusTone(task.status)}>
                          {pickTaskStatusLabel(task.status)}
                        </StatusLabel>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">{task.assignee}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {task.status === 'PENDING' ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-ink-soft hover:text-accent"
                            onClick={() => openConfirm(task)}
                          >
                            Xác nhận
                          </button>
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

      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title="Xác nhận soạn hàng"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTarget(null)}>
              Đóng
            </Button>
            <Button size="sm" onClick={confirm} isLoading={busy}>
              Xác nhận
            </Button>
          </div>
        }
      >
        {target ? (
          <div className="space-y-3">
            <div className="border border-line p-3 text-[12px] text-ink-soft">
              <div className="flex justify-between">
                <span>Đơn</span>
                <span className="font-mono text-ink">{target.orderTrackingCode}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>SKU</span>
                <span className="font-mono text-ink">{target.sku}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Bin</span>
                <span className="font-mono text-ink">{target.binCode}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Cần soạn</span>
                <span className="tabular-nums text-ink">{target.quantity}</span>
              </div>
            </div>
            <Input
              label="Số lượng thực tế đã lấy"
              type="number"
              min={1}
              max={target.quantity}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            {Number(quantity) < target.quantity ? (
              <p className="border-l-2 border-warning pl-2 text-[12px] text-warning">
                Nhỏ hơn yêu cầu: tác vụ chuyển sang Thiếu hàng (SHORT).
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
