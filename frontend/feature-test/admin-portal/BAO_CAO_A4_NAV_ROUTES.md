# BÁO CÁO — A4: đưa 3 trang (control-tower, pricing, ai-insights) vào điều hướng admin

> Mở rộng: `frontend/feature-test/admin-portal/` (làn A4). Ngày: 2026-11-12.
> Tiêu bản: `docs/plans/design-refresh-no-icons.md` + `docs/plans/ui-consistency.md`.
> Không thêm namespace mới, không file cũ bị xóa, ngôn ngữ tĩnh.

## 1. Vấn đề

3 trang admin đã tồn tại theo hợp đồng `/api/v1/*`-mock (folder `src/app/admin/control-tower/`,
`src/app/admin/pricing/`, `src/app/admin/ai-insights/` — file **chưa được đăng ký** trong
sidebar):

- Chưa có mục menu trong `adminSections` → `Sidebar` (ui-kit) không hiển thị.
- `NAV_ITEM_ROLES` trong `src/app/admin/layout.tsx` chưa tham chiếu → tenant cácroleId
  WAREHOUSE_MANAGER / WAREHOUSE_STAFF / LOGISTICS_MANAGER không thấy menu.
- `src/lib/rbac.ts` `PAGE_PERMISSIONS` đã có đủ 3 entry (`/admin/control-tower`,
  `/admin/pricing`, `/admin/ai-insights`) → chỉ thiếu layer render bên trên.

## 2. Thay đổi

**File duy nhất sửa: `src/app/admin/layout.tsx`** (chỉ liệt kê mục điều hướng; cơ sở icon/
cấu hình shell đang đóng băng `packages/ui-kit/**`).

### a) Quyền truy cập menu (`NAV_ITEM_ROLES`)
```ts
'/admin/control-tower': ['SUPER_ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'LOGISTICS_MANAGER'],
'/admin/pricing':     ['SUPER_ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'LOGISTICS_MANAGER'],
'/admin/ai-insights': ['SUPER_ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'LOGISTICS_MANAGER'],
```
Chính xác với `PAGE_PERMISSIONS` trong `src/lib/rbac.ts` (khớp dòng 50/51/52).

### b) Mục sidebar (`adminSections`)
| Section | Mục | Route |
|---|---|---|
| Overview | Control tower | `/admin/control-tower` |
| Administration | Pricing | `/admin/pricing` |
| AI | AI insights | `/admin/ai-insights` |

Sau sửa, `adminSections` = 4 nhóm: Overview (Dashboard, Orders, Shipments, Control tower),
Administration (Tenants, Billing, Pricing), AI (AI Models, AI insights), System
(Audit logs, Profile). Tổng 10 mục, 3 mục nhánh (`orders/new`, `orders/upload`) giữ
nguyên chế độ ẩn.

## 3. Kiểm tra tĩnh

| Thang đo | Kết quả |
|---|---|
| Import `ui-kit` (EditorialPageHeader / EditorialSection / MetricBand / StatusLabel) | 4/4 hàm tồn tại `packages/ui-kit/src/editorial.tsx` |
| Import `ui-components` (TableState, Button, Input, Modal, Select) | 5/5, xuất qua `ui-components/src/index.ts` → `DataState.tsx`, `Button`, `Input`, `Modal`, `Select` |
| Import `@/lib/format` (`formatNumber`, `formatCurrency`, `formatDateTime`) | 3/3 |
| Import `@/lib/local-store` (loại + hàm: `ControlTowerData`, `NetworkNode`, `Shipment`, `getControlTower`, `setControlTower`, `getPricing`, `setPricing`, `savePricingRule`, `updatePricingRule`, `removePricingRule`, `decideInsight`, `getInsights`, `getAll`, `initStore`, `AIModel`, `AIInsight`, `LogisticsData`, `PricingData`, `PricingRule`) | 22/22 |
| JSX / ngoặc phân bù | 0 sai lệch cho 3 page + layout |
| `console.log` / `TODO` / `FIXME` / `alert()` / `debugger`残留 | 0 (sweep sạch) |
| Số `placeholder` | 0 ngoài `placeholder` thuộc tính form hợp lệ (chuẩn) |
| Bảng 4 trạng thái (loading/empty/error/data) | Đủ qua `TableState` ở control-tower, pricing, ai-insights |
| Víền `AppShell` double padding | Không (page dùng `space-y-6`) |
| Double side-bar | Không (admin layout dùng `ui-kit` AppShell; root `layout.tsx` chỉ render
children cho admin) |
| fonts / token / color | Không thay đổi |
| Import chéo portal | 0 |

## 4. Lỗi / thiếu / sai sót phát hiện

1. **Tên doc cũ lệch thực tế**: `docs/agent-prompts/PROGRESS.md` đường dẫn
   `/admin/insights` (dòng 110, 146) trong khi file trang là `src/app/admin/ai-insights/`.
   Nav hiện tại dùng `ai-insights` đúng với file. Báo A0/A6 chú ý đồng bộ hồ sơ.
2. **6 trang admin tồn tại nhưng饋 điều hướng**: `managerial-insights`, `cost-calculator`,
   `logistics-simulation`, `customer-support`, `driver-assistant`, `operations` — gate
   trong `PAGE_PERMISSIONS` nhưng **không có mục menu** trong `adminSections`. Đây là
   lỗ hổng cũ, nằm ngoài phạm vi A4 (chỉ thêm 3 route được yêu cầu). Thêm menu ngoài
   phạm vi → ghi nhận.
3. **Toast**: 3 trang dùng `window.dispatchEvent(new CustomEvent('show-toast'))`;
   `ToastHost` (root layout `app/layout.tsx`) lắng nghe và render. Không có lỗi.

## 5. Khu vực không chạm (tuân thủ phân vùng)

- `frontend/reporting/tenant-portal/**` (A0-A3): không sửa, dù một số file đang modified
  từ trước (lan khác).
- `frontend/mobile/driver-app/**`: không sửa.
- `frontend/reporting/customer-portal/**`, `frontend/reporting/pack-station-web/**`:
  không sửa.
- `packages/ui-kit`, `packages/ui-components`, `packages/ui-tokens`, `packages/map-components`:
  không sửa.
- `pnpm-lock.yaml`, `package.json` workspace, `docker-compose.yml`: không sửa.

## 6. Hoàn thành

- Route đã thêm vào sidebar admin: `/admin/control-tower`, `/admin/pricing`,
  `/admin/ai-insights`.
- Quyền menu đồng bộ 1:1 với `PAGE_PERMISSIONS` (rbac.ts).
- `roleCanAccessPage`/`getDefaultPageForRole` (rbac.ts) vẫn đúng, không thay đổi logic.
- Không còn TODO/FIXME/placeholder trống/console.log trong vùng admin-portal/src.
