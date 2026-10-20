'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import {
  EditorialPageHeader,
  EditorialSection,
  EmptyNote,
  MetricBand,
  StatusLabel,
} from '../../../../../../packages/ui-kit/editorial';

type ScanLog = {
  barcode: string;
  time: string;
  ok: boolean;
};

export default function PackPage() {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [recentLogs, setRecentLogs] = useState<ScanLog[]>([]);

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = barcode.trim();
    if (!code) return;

    setScanning(true);
    setResult(null);

    try {
      const response = await api.post('/inventory/ops/pack-log', {
        barcode: code,
        deviceId: 'pack-station-web',
      });

      if (response.data) {
        setResult({ ok: true, message: `Đã ghi nhận kiện ${code}` });
        setRecentLogs((previous) =>
          [
            {
              barcode: code,
              time: new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(new Date()),
              ok: true,
            },
            ...previous,
          ].slice(0, 10),
        );
        setBarcode('');
      }
    } catch (error: any) {
      setResult({
        ok: false,
        message: error.response?.data?.message || error.message || 'Không ghi nhận được kiện.',
      });
    } finally {
      setScanning(false);
    }
  };

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const statusTone = scanning ? 'warning' : result?.ok === false ? 'danger' : 'success';
  const statusText = scanning
    ? 'Đang ghi nhận'
    : result?.ok === false
      ? 'Cần kiểm tra'
      : 'Sẵn sàng nhận kiện';
  const statusShort = scanning ? 'Đang ghi nhận' : result?.ok === false ? 'Cần kiểm tra' : 'Sẵn sàng';

  return (
    <div className="max-w-[1040px] space-y-4">
      <EditorialPageHeader
        eyebrow={
          <>
            <span>{today}</span>
            <span className="text-line-strong" aria-hidden="true">
              /
            </span>
            <span>Pack station</span>
          </>
        }
        title="Trạm đóng gói"
        description="Quét hoặc nhập mã kiện để ghi nhận bàn giao. Mỗi lần quét tạo một bản ghi trong nhật ký đóng gói."
        meta={
          <>
            <p>{user?.fullName ? `Nhân viên: ${user.fullName}` : 'Thiết bị: pack-station-web'}</p>
            <p className="mt-0.5">
              <StatusLabel tone={statusTone}>{statusText}</StatusLabel>
            </p>
          </>
        }
      />

      <MetricBand
        metrics={[
          {
            label: 'Lượt quét phiên',
            value: recentLogs.length,
            meta: 'Trong phiên hiện tại',
          },
          {
            label: 'Lượt cuối',
            value: recentLogs[0]?.time ?? '—',
            meta: recentLogs[0] ? 'Đã ghi nhận' : 'Chưa có lượt quét',
          },
          {
            label: 'Thiết bị',
            value: <span className="text-[16px]">pack-station-web</span>,
            meta: 'Mã thiết bị tại trạm',
          },
          {
            label: 'Trạng thái',
            value: statusShort,
            meta: result?.ok === false ? 'Cần xử lý trước khi tiếp tục' : 'Kết nối API vận hành',
            tone: statusTone,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section className="border-y border-line py-4">
            <form onSubmit={handleScan} className="space-y-3">
              <label
                htmlFor="pack-barcode"
                className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
              >
                Mã kiện / vận đơn
              </label>
              <input
                id="pack-barcode"
                type="text"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Quét hoặc nhập mã kiện…"
                className="h-12 w-full rounded-md border border-line bg-surface px-3 font-mono text-[16px] tracking-wide text-ink outline-none placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
                autoFocus
                disabled={scanning}
                autoComplete="off"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] leading-4 text-ink-faint">
                  Nhấn Enter để ghi nhận. Mã không hợp lệ sẽ không được lưu.
                </p>
                <button
                  type="submit"
                  disabled={!barcode.trim() || scanning}
                  className="h-10 rounded-md bg-accent px-5 text-[12px] font-semibold text-surface transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scanning ? 'Đang ghi nhận…' : 'Ghi nhận kiện'}
                </button>
              </div>
            </form>

            {result ? (
              <div
                className={`mt-3 flex items-start gap-2 border-l-2 px-3 py-2 text-[12px] leading-5 ${
                  result.ok
                    ? 'border-success bg-surface text-ink-soft'
                    : 'border-danger bg-surface text-ink-soft'
                }`}
                role="status"
              >
                <StatusLabel tone={result.ok ? 'success' : 'danger'}>
                  {result.ok ? 'Thành công' : 'Từ chối'}
                </StatusLabel>
                <span>{result.message}</span>
              </div>
            ) : null}
          </section>

          <EditorialSection
            eyebrow="Nhật ký"
            title="Lượt quét gần đây"
            action={
              recentLogs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setRecentLogs([])}
                  className="text-[12px] font-medium text-ink-faint underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent"
                >
                  Xóa danh sách
                </button>
              ) : null
            }
          >
            {recentLogs.length === 0 ? (
              <EmptyNote>Chưa có lượt quét nào trong phiên này. Kết quả sẽ xuất hiện tại đây sau khi ghi nhận.</EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-left">
                  <caption className="sr-only">Các mã kiện đã ghi nhận trong phiên hiện tại</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th
                        scope="col"
                        className="h-8 pr-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint"
                      >
                        Mã kiện
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
                    {recentLogs.map((log, index) => (
                      <tr
                        key={`${log.barcode}-${index}`}
                        className="h-[42px] border-b border-line/80 transition-colors hover:bg-surface-alt/60"
                      >
                        <td className="pr-3 font-mono text-[12px] font-medium text-ink">{log.barcode}</td>
                        <td className="px-3 text-[12px] tabular-nums text-ink-soft">{log.time}</td>
                        <td className="pl-3 text-right">
                          <StatusLabel tone={log.ok ? 'success' : 'danger'}>
                            {log.ok ? 'Đã ghi nhận' : 'Lỗi'}
                          </StatusLabel>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EditorialSection>

          <EditorialSection eyebrow="Quy trình" title="Ba bước tại trạm">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Đối chiếu',
                  copy: 'So mã trên kiện với mã hiển thị trên màn hình trước khi quét.',
                },
                {
                  step: '02',
                  title: 'Ghi nhận',
                  copy: 'Quét hoặc nhập mã, kiểm tra lại một lần rồi nhấn Enter.',
                },
                {
                  step: '03',
                  title: 'Bàn giao',
                  copy: 'Đưa kiện đã ghi nhận sang khu vực chờ và báo quản lý ca nếu có bất thường.',
                },
              ].map((item) => (
                <div key={item.step} className="border-t border-line pt-3">
                  <p className="font-mono text-[11px] font-medium text-accent">{item.step}</p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-5 text-ink-soft">{item.copy}</p>
                </div>
              ))}
            </div>
          </EditorialSection>
        </div>

        <aside className="space-y-5 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Phiên làm việc
            </p>
            <dl className="mt-2 space-y-2 text-[12px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Thiết bị</dt>
                <dd className="font-mono text-[11px] font-medium text-ink">pack-station-web</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Lượt quét</dt>
                <dd className="tabular-nums font-medium text-ink">{recentLogs.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Lượt cuối</dt>
                <dd className="tabular-nums font-medium text-ink">
                  {recentLogs[0]?.time ?? 'Chưa có'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-faint">Trạng thái</dt>
                <dd>
                  <StatusLabel tone={statusTone}>{statusText}</StatusLabel>
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Trước khi ghi nhận
            </p>
            <ul className="mt-2 space-y-2 border-l-2 border-line-strong pl-3 text-[12px] leading-5 text-ink-soft">
              <li>Đối chiếu mã trên kiện với màn hình.</li>
              <li>Chỉ ghi nhận kiện đã đóng và dán nhãn.</li>
              <li>Báo quản lý ca nếu mã không hợp lệ.</li>
            </ul>
          </div>

          <EmptyNote>
            Nhật ký đầy đủ nằm trong mục Nhật ký. Trang này chỉ giữ các lượt quét của phiên hiện tại.
          </EmptyNote>
        </aside>
      </div>
    </div>
  );
}
