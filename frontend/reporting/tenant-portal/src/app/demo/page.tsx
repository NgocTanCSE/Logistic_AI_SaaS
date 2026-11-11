'use client';

import Link from 'next/link';
import { EditorialPageHeader, EditorialSection, MetricBand, StatusLabel } from 'ui-kit';
import type { EditorialMetric } from 'ui-kit';

type DemoItem = {
  chapter: string;
  title: string;
  capability: string;
  how: string;
  href: string;
  cta: string;
  status: 'READY' | 'SIMULATION';
  metrics?: string[];
};

const ITEMS: DemoItem[] = [
  {
    chapter: 'Ch. 12 · TMS',
    title: 'Tối ưu lộ trình CVRP',
    capability:
      'Gom đơn theo tải trọng xe, giải bài toán định tuyến đa điểm và so sánh quãng đường trước/sau tối ưu.',
    how: 'Chọn đơn → chọn đội xe → chạy tối ưu → xem lộ trình mới trên bản đồ.',
    href: '/logistics/optimize',
    cta: 'Mở demo CVRP',
    status: 'READY',
    metrics: ['Giảm 15% quãng đường', 'Ràng buộc tải trọng', 'Leaflet-style map'],
  },
  {
    chapter: 'Ch. 15 · Dispatch',
    title: 'Dispatch Tower thời gian thực',
    capability:
      'Bản đồ trực tuyến hiển thị xe đang chạy, tiến độ chuyến, cảnh báo SOS và vùng cấm.',
    how: 'Xem xe di chuyển mô phỏng, mở chuyến để gán tài xế/xe, xử lý SOS.',
    href: '/logistics/control-tower',
    cta: 'Mở Control Tower',
    status: 'READY',
    metrics: ['Live radar', 'SOS feed', 'Tiến độ chuyến'],
  },
  {
    chapter: 'Ch. 10 · WMS',
    title: 'Cấp phát FIFO / LIFO / FEFO',
    capability:
      'So sánh ba chiến lược cấp phát trên cùng một lô tồn kho, thấy rõ bin và hạn sử dụng được chọn.',
    how: 'Chọn kho + đơn → chọn chiến lược → hệ thống phân bổ và tạo pick task.',
    href: '/wms/waves',
    cta: 'Mở Wave Picking',
    status: 'READY',
    metrics: ['3 chiến lược', 'Bin & hạn dùng', 'Pick task tự sinh'],
  },
  {
    chapter: 'Ch. 10 · WMS',
    title: 'Putaway theo sức chứa bin',
    capability:
      'Gợi ý vị trí cất hàng tối ưu dựa trên tải trọng và thể tích còn trống của từng bin.',
    how: 'Chọn SKU + số lượng → chạy gợi ý → xem bin phù hợp và mức lấp đầy.',
    href: '/inventory/putaway',
    cta: 'Mở Putaway',
    status: 'READY',
    metrics: ['Tải trọng', 'Thể tích', 'Nhiều kho'],
  },
  {
    chapter: 'Ch. 10 · WMS',
    title: 'Khóa lạc quan (Optimistic Locking)',
    capability:
      'Mô phỏng hai thủ kho cùng trừ tồn: phiên bản `version` lệch sẽ bị từ chối và rollback.',
    how: 'Bấm “mô phỏng tranh chấp” để xem giao dịch thứ hai bị chặn.',
    href: '/inventory/locking',
    cta: 'Mở mô phỏng khóa',
    status: 'SIMULATION',
    metrics: ['version mismatch', 'Rollback', 'Chống âm kho'],
  },
  {
    chapter: 'Ch. 14 · GPS',
    title: 'Geofencing & cảnh báo xâm nhập',
    capability:
      'Vẽ vùng an toàn/cấm trên bản đồ, mô phỏng xe đi vào vùng cấm và phát cảnh báo tức thời.',
    how: 'Chọn vùng → bấm mô phỏng di chuyển → xem cảnh báo SOS được tạo.',
    href: '/logistics/geofences',
    cta: 'Mở Geofence',
    status: 'READY',
    metrics: ['ST_Contains mô phỏng', 'SOS tự động'],
  },
  {
    chapter: 'Ch. 13 · AI Core',
    title: 'AI dự báo & phát hiện bất thường',
    capability:
      'Dự báo nhu cầu, thời gian giao, phát hiện chi phí bất thường và nguy cơ rời bỏ khách hàng.',
    how: 'Chọn mô hình → xem biểu đồ, độ tin cậy và khuyến nghị xử lý.',
    href: '/admin/ai-insights',
    cta: 'Mở AI Core',
    status: 'READY',
    metrics: ['Demand', 'ETA', 'Anomaly', 'Churn'],
  },
  {
    chapter: 'Ch. 16 · COD',
    title: 'Đối soát ngân hàng tự động',
    capability:
      'So khớp sao kê ngân hàng với phiếu nộp COD qua mã QR định danh và số tiền.',
    how: 'Tải sao kê mẫu → hệ thống tự khớp → xem phiếu RECONCILED hoặc lệch.',
    href: '/finance/cod',
    cta: 'Mở đối soát COD',
    status: 'READY',
    metrics: ['QR token', 'Khớp số tiền', 'Cảnh báo lệch'],
  },
  {
    chapter: 'Ch. 11 · Edge AI',
    title: 'Trạm đóng gói nhận diện SKU',
    capability:
      'Camera + mô hình biên dự đoán mã hàng, con người đính chính khi AI sai (human-in-the-loop).',
    how: 'Mở trạm đóng gói → quét → xem độ tin cậy và đính chính.',
    href: 'http://localhost:4004/pack',
    cta: 'Mở Pack Station',
    status: 'READY',
    metrics: ['TensorFlow.js', 'Confidence', 'Đính chính'],
  },
  {
    chapter: 'Ch. 9 · IAM',
    title: 'Ma trận phân quyền RBAC',
    capability:
      'Bảy vai trò với quyền WMS/TMS/GPS/Tài chính khác nhau; menu và thao tác bị ẩn theo vai trò.',
    how: 'Đổi vai trò ở góc trên → menu và nút thao tác thay đổi ngay.',
    href: '/roles',
    cta: 'Xem ma trận quyền',
    status: 'READY',
    metrics: ['7 vai trò', 'Menu theo quyền'],
  },
];

const STATUS_LABEL: Record<DemoItem['status'], string> = {
  READY: 'Sẵn sàng',
  SIMULATION: 'Mô phỏng',
};

export default function DemoHubPage() {
  const metrics: EditorialMetric[] = [
    { label: 'Nhóm năng lực', value: String(ITEMS.length) },
    { label: 'Chiến lược cấp phát', value: '3', meta: 'FIFO · LIFO · FEFO' },
    { label: 'Mô hình AI', value: '4', meta: 'Demand · ETA · Anomaly · Churn' },
    { label: 'Vai trò RBAC', value: '7', meta: 'Có kiểm soát route' },
  ];

  return (
    <>
      <EditorialPageHeader
        eyebrow="Trung tâm demo"
        title="Năng lực hệ thống SmartLogi"
        description="Mỗi năng lực trong báo cáo kỹ thuật được dựng thành một màn hình vận hành có thể bấm chạy. Dữ liệu là mock tất định, sẵn sàng thay bằng /api/v1 khi backend thật hoạt động."
        meta="Dữ liệu mock · Cập nhật theo thao tác"
      />

      <MetricBand metrics={metrics} />

      <EditorialSection
        title="Danh mục demo"
        eyebrow="Theo phân hệ"
        action={
          <span className="text-[11px] text-ink-faint">
            Chọn một mục để mở màn hình tương ứng
          </span>
        }
      >
        <div className="divide-y divide-line border-y border-line">
          {ITEMS.map((item) => (
            <div
              key={item.href}
              className="grid gap-3 py-4 md:grid-cols-[150px_1fr_auto] md:items-start"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                {item.chapter}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">{item.title}</h3>
                  <StatusLabel tone={item.status === 'READY' ? 'success' : 'info'}>
                    {STATUS_LABEL[item.status]}
                  </StatusLabel>
                </div>
                <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
                  {item.capability}
                </p>
                <p className="mt-1 text-[12px] text-ink-faint">
                  <span className="font-semibold text-ink-soft">Cách demo: </span>
                  {item.how}
                </p>
                {item.metrics ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-faint">
                    {item.metrics.map((metric) => (
                      <span key={metric} className="tabular-nums">
                        · {metric}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="md:pt-1">
                {item.href.startsWith('http') ? (
                  <a
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    {item.cta}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="inline-flex h-8 items-center rounded-md border border-line px-3 text-[11px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    {item.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </EditorialSection>

      <EditorialSection title="Luồng nghiệp vụ liên thông" eyebrow="Ch. 17">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-line p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Luồng 1 · Kho
            </div>
            <ol className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink-soft">
              <li>1. Nhập kho → WMS gợi ý vị trí cất hàng theo sức chứa bin.</li>
              <li>2. Gom đơn thành wave theo FIFO/LIFO/FEFO.</li>
              <li>3. Soạn hàng theo pick task, xác nhận số lượng.</li>
              <li>4. Trạm đóng gói quét SKU, AI đối chiếu trước khi seal.</li>
            </ol>
          </div>
          <div className="border border-line p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Luồng 2 · Giao hàng
            </div>
            <ol className="mt-2 space-y-1 text-[13px] leading-relaxed text-ink-soft">
              <li>1. TMS tối ưu lộ trình CVRP và gán tài xế/xe.</li>
              <li>2. GPS ghi nhận toạ độ, geofence phát hiện vi phạm.</li>
              <li>3. Tài xế giao hàng, thu COD, nộp quyết toán.</li>
              <li>4. Kế toán đối soát sao kê ngân hàng tự động.</li>
            </ol>
          </div>
        </div>
      </EditorialSection>
    </>
  );
}
