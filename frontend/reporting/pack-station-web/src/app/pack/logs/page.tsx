'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
  EditorialPageHeader,
  EditorialSection,
  EmptyNote,
  MetricBand,
  StatusLabel,
} from '../../../../../../../packages/ui-kit/editorial';

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function PackLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/inventory/ops/pack-log');
      const data = response.data;
      setLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Không tải được nhật ký đóng gói.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchLogs();
  }, [token, fetchLogs]);

  const warehouseCount = new Set(
    logs.map((log: any) => log.warehouse?.code).filter(Boolean),
  ).size;
  const deviceCount = new Set(
    logs.map((log: any) => log.deviceId).filter(Boolean),
  ).size;

  return (
    <div className="max-w-[1040px] space-y-4">
      <EditorialPageHeader
        eyebrow={
          <>
            <span>Pack station</span>
            <span className="text-line-strong" aria-hidden="true">
              /
            </span>
            <span>Nhật ký</span>
          </>
        }
        title="Nhật ký đóng gói"
        description="Toàn bộ lượt ghi nhận kiện tại trạm đóng gói, sắp xếp theo thời điểm mới nhất."
        meta={
          <>
            <p>{logs.length} bản ghi đang hiển thị</p>
            <p className="mt-0.5">
              <StatusLabel tone={error ? 'danger' : loading ? 'neutral' : 'success'}>
                {error ? 'Không tải được dữ liệu' : loading ? 'Đang đồng bộ' : 'Đã kết nối'}
              </StatusLabel>
            </p>
          </>
        }
        actions={
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="h-9 rounded-md border border-line px-3 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        }
      />

      <MetricBand
        metrics={[
          {
            label: 'Bản ghi',
            value: logs.length,
            meta: 'Đang hiển thị',
          },
          {
            label: 'Kho',
            value: warehouseCount,
            meta: 'Kho có phát sinh',
          },
          {
            label: 'Thiết bị',
            value: deviceCount,
            meta: 'Thiết bị gửi dữ liệu',
          },
          {
            label: 'Trạng thái',
            value: error ? 'Gián đoạn' : loading ? 'Đang đồng bộ' : 'Đã kết nối',
            meta: error ? 'Kiểm tra kết nối API' : 'Nguồn: inventory-service',
            tone: error ? 'danger' : loading ? 'warning' : 'success',
          },
        ]}
      />

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-danger bg-surface px-3 py-2 text-[12px] text-ink-soft">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchLogs}
            className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <EditorialSection eyebrow="Lịch sử" title="Các lượt ghi nhận">
        {loading && logs.length === 0 ? (
          <p className="text-[12px] text-ink-faint">Đang tải nhật ký…</p>
        ) : logs.length === 0 ? (
          <EmptyNote>
            Chưa có lượt ghi nhận nào. Quay lại trạm đóng gói và quét mã kiện để tạo bản ghi đầu tiên.
          </EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">Nhật ký các lượt ghi nhận kiện tại trạm đóng gói</caption>
              <thead>
                <tr className="border-b border-line">
                  <th
                    scope="col"
                    className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Mã đơn
                  </th>
                  <th
                    scope="col"
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Kho / thiết bị
                  </th>
                  <th
                    scope="col"
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Thời điểm
                  </th>
                  <th
                    scope="col"
                    className="h-8 pl-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                  >
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, index: number) => (
                  <tr
                    key={log.id || index}
                    className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                  >
                    <td className="pr-3 font-mono text-[12px] font-medium text-ink">
                      {log.order?.trackingCode || log.orderId || '—'}
                    </td>
                    <td className="px-3 text-[12px] text-ink-soft">
                      {log.warehouse?.code || log.deviceId || 'Pack station'}
                    </td>
                    <td className="px-3 text-[12px] tabular-nums text-ink-soft">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="pl-3 text-right">
                      <StatusLabel tone="success">Đã ghi nhận</StatusLabel>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EditorialSection>
    </div>
  );
}
