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
import { Button, DataState, Input, Select } from 'ui-components';
import type { InventoryItem } from '@/lib/mock';
import { formatDateTimeVN, formatNumber } from '@/lib/labels';

type Step = {
  at: string;
  actor: string;
  action: string;
  result: 'SUCCESS' | 'CONFLICT' | 'READ';
  detail: string;
};

const RESULT_LABEL: Record<Step['result'], string> = {
  SUCCESS: 'Thành công',
  CONFLICT: 'Xung đột phiên bản',
  READ: 'Đọc dữ liệu',
};

const RESULT_TONE: Record<Step['result'], 'success' | 'danger' | 'info'> = {
  SUCCESS: 'success',
  CONFLICT: 'danger',
  READ: 'info',
};

export default function OptimisticLockingPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const [contended, setContended] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await data.inventory.list();
      setItems(rows);
      setSelectedId((current) => current || rows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tồn kho.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const runSimulation = async () => {
    if (!selected) return;
    setRunning(true);
    setSteps([]);
    setContended(false);
    const delta = Math.abs(Number(quantity) || 1);
    const baseVersion = selected.version;
    const baseQuantity = selected.quantity;

    const push = (step: Step) => setSteps((current) => [...current, step]);
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    push({
      at: new Date().toLocaleTimeString('vi-VN'),
      actor: 'Thủ kho A',
      action: 'Đọc tồn kho',
      result: 'READ',
      detail: `${selected.sku} · bin ${selected.binCode} · SL ${baseQuantity} · version ${baseVersion}`,
    });
    await wait(220);
    push({
      at: new Date().toLocaleTimeString('vi-VN'),
      actor: 'Thủ kho B',
      action: 'Đọc tồn kho',
      result: 'READ',
      detail: `Cùng version ${baseVersion} · SL ${baseQuantity}`,
    });
    await wait(220);
    push({
      at: new Date().toLocaleTimeString('vi-VN'),
      actor: 'Thủ kho A',
      action: `Ghi điều chỉnh -${delta}`,
      result: 'SUCCESS',
      detail: `Kiểm tra version ${baseVersion} khớp → cập nhật version ${baseVersion + 1}`,
    });
    await wait(320);
    push({
      at: new Date().toLocaleTimeString('vi-VN'),
      actor: 'Thủ kho B',
      action: `Ghi điều chỉnh -${delta}`,
      result: 'CONFLICT',
      detail: `Gửi kèm version ${baseVersion} nhưng bản ghi đã ở version ${baseVersion + 1} → rollback, trả 409`,
    });

    setContended(true);
    setRunning(false);
  };

  const applyValidAdjustment = async () => {
    if (!selected) return;
    const delta = Math.abs(Number(quantity) || 1);
    setRunning(true);
    try {
      await data.inventory.adjust({
        inventoryId: selected.id,
        quantity: -delta,
        reason: 'Mô phỏng điều chỉnh hợp lệ sau khi đọc lại version',
      });
      setSteps((current) => [
        ...current,
        {
          at: new Date().toLocaleTimeString('vi-VN'),
          actor: 'Thủ kho B',
          action: `Đọc lại + ghi điều chỉnh -${delta}`,
          result: 'SUCCESS',
          detail: 'Đọc version mới nhất rồi ghi lại → thành công, không ghi đè dữ liệu cũ.',
        },
      ]);
      setContended(false);
      await load();
    } catch (err) {
      setSteps((current) => [
        ...current,
        {
          at: new Date().toLocaleTimeString('vi-VN'),
          actor: 'Hệ thống',
          action: 'Từ chối điều chỉnh',
          result: 'CONFLICT',
          detail: err instanceof Error ? err.message : 'Không điều chỉnh được.',
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const metrics: EditorialMetric[] = selected
    ? [
        { label: 'SKU', value: selected.sku, meta: selected.productName },
        { label: 'Tồn hiện tại', value: formatNumber(selected.quantity), meta: `Khả dụng ${selected.available}` },
        { label: 'Phiên bản', value: `v${selected.version}`, meta: 'Dùng cho optimistic lock' },
        { label: 'Cập nhật', value: formatDateTimeVN(selected.updatedAt), tone: 'default' },
      ]
    : [];

  return (
    <>
      <EditorialPageHeader
        eyebrow="WMS · Ch. 10"
        title="Khóa lạc quan chống âm kho"
        description="Hai thủ kho cùng đọc một bản ghi tồn kho. Giao dịch đầu ghi thành công và tăng `version`; giao dịch sau gửi version cũ nên bị từ chối và rollback — đúng cơ chế optimistic locking mô tả trong báo cáo."
      />

      <MetricBand metrics={metrics} />

      <DataState loading={loading} empty={!loading && items.length === 0} error={error} onRetry={load}>
        {selected ? (
          <>
            <EditorialSection title="Kịch bản tranh chấp" eyebrow="Thiết lập">
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                  <Select
                    label="Bản ghi tồn kho"
                    value={selectedId}
                    onChange={(event) => {
                      setSelectedId(event.target.value);
                      setSteps([]);
                      setContended(false);
                    }}
                    options={items.map((item) => ({
                      value: item.id,
                      label: `${item.sku} · ${item.binCode} · SL ${item.quantity}`,
                    }))}
                  />
                  <Input
                    label="Số lượng điều chỉnh"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={runSimulation} isLoading={running} disabled={running}>
                      Mô phỏng tranh chấp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={applyValidAdjustment}
                      disabled={running}
                    >
                      Đọc lại &amp; ghi hợp lệ
                    </Button>
                  </div>
                  <div className="border border-line p-3 text-[12px] text-ink-soft">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                      Nguyên tắc
                    </div>
                    <p className="mt-1">
                      Mỗi bản ghi có cột <span className="font-mono">version</span>. Giao dịch ghi
                      phải gửi kèm version đã đọc. Nếu version lệch, DB trả lỗi và giao dịch bị
                      rollback thay vì ghi đè.
                    </p>
                  </div>
                </div>

                <div className="border border-line">
                  <div className="border-b border-line bg-surface-alt px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                    Nhật ký mô phỏng
                  </div>
                  {steps.length === 0 ? (
                    <div className="p-4">
                      <EmptyNote>
                        Bấm “Mô phỏng tranh chấp” để xem hai giao dịch cùng ghi một bản ghi.
                      </EmptyNote>
                    </div>
                  ) : (
                    <ol className="divide-y divide-line">
                      {steps.map((step, index) => (
                        <li key={index} className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] tabular-nums text-ink-faint">{step.at}</span>
                            <span className="text-[12px] font-semibold text-ink">{step.actor}</span>
                            <span className="text-[12px] text-ink-soft">{step.action}</span>
                            <StatusLabel tone={RESULT_TONE[step.result]}>
                              {RESULT_LABEL[step.result]}
                            </StatusLabel>
                          </div>
                          <p className="mt-1 text-[11px] text-ink-faint">{step.detail}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              {contended ? (
                <div className="mt-4 border-l-2 border-danger bg-surface px-3 py-2 text-[12px] text-ink">
                  Giao dịch của Thủ kho B đã bị chặn đúng như thiết kế. Tồn kho không bị trừ hai
                  lần, không âm kho.
                </div>
              ) : null}
            </EditorialSection>

            <EditorialSection title="Vì sao cần cơ chế này" eyebrow="Ch. 10">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">Không khóa bảng</div>
                  <p className="mt-1">
                    Nhiều thủ kho soạn hàng đồng thời vẫn đọc/ghi song song, không bị chặn cứng.
                  </p>
                </div>
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">Chống ghi đè</div>
                  <p className="mt-1">
                    Giao dịch dựa trên dữ liệu cũ bị từ chối, buộc đọc lại trước khi ghi.
                  </p>
                </div>
                <div className="border border-line p-3 text-[12px] text-ink-soft">
                  <div className="font-semibold text-ink">Không âm kho</div>
                  <p className="mt-1">
                    Kết hợp kiểm tra số lượng sau điều chỉnh ≥ 0 để chặn tồn âm.
                  </p>
                </div>
              </div>
            </EditorialSection>
          </>
        ) : (
          <EmptyNote>Chưa có bản ghi tồn kho để mô phỏng.</EmptyNote>
        )}
      </DataState>
    </>
  );
}
