# Báo cáo Lane A0b — Tenant Portal (demo + hoàn thiện chuẩn)

> Ngày: 2026-11-12 · Lane: A0b
> Phạm vi: `frontend/reporting/tenant-portal/src/` (dashboard, demo, login, page, layout,
> error, loading, components; ngoại trừ `src/components/Sidebar.tsx` và `src/lib/**`).

---

## 1. File đã sửa / tạo mới

| File | Thay đổi |
|---|---|
| `src/components/DemoRoleSwitcher.tsx` | **Mới.** Chuyển vai trò demo ngay góc phải topbar: đọc `mockLogin` + `setAuthToken` của `useAuth()`, bản ghi cho `ROLE_REDIRECT` của trang (TENANT_ADMIN/WAREHOUSE_MANAGER/WAREHOUSE_STAFF → `/dashboard`; LOGISTICS_MANAGER → `/logistics/dispatch`; DRIVER → `/drivers/my-trips`). Không qua server, dữ liệu mock giữ ở localStorage. |
| `src/components/Header.tsx` | Rẽ `actions` thành nhóm `<DemoActions /> + <DemoRoleSwitcher />`, chỉ khi `isMockDataSource`. |
| `src/components/ai/AIFeedbackModal.tsx` | Bỏ 2 `alert()` + 1 `console.error`; bỏ icon sấm sét trang trí; dùng `Modal` + `StatusLabel` theo hệ editorial; ghi nhận mock tại chỗ + toast; lỗi báo bằng banner nội tuyến. |
| `src/components/ErrorBoundary.tsx` | Bỏ `console.error`; thêm `onError` tùy chọn để trang ghi log; giao diện bắt lỗi dùng token (nền `canvas`, chữ `ink/ink-soft`, nút "Tải lại"), bỏ icon + `text-red-500`. |
| `src/app/error.tsx` | Migrate sang hệ editorial: tiếng Việt đầy đủ, token `canvas/ink/ink-soft/line`, nút "Thử lại" viền; loại bỏ `rose-500`, `rose-100`, `rounded-xl` legacy. |
| `src/app/loading.tsx` | Spinner + chữ tiếng Việt, token `line`/`accent`; bỏ `system-ui` inline, `@keyframes` trùng lặp. |
| `src/app/dashboard/page.tsx` | Bảng hàng đợi giờ dùng `TableState` của `ui-components` → đủ 4 trạng thái: loading skeleton, rỗng, lỗi có "Thử lại", dữ liệu. |
| `src/components/AIChatButton.tsx` | Đẩy token (nền `canvas`, viền `line`, `text-ink-soft`, `accent`), bỏ `shadow-floating`/`slate-*`/`rounded-2xl`, nút upload chuyển từ icon rỗng sang "Tải ảnh" theo chính sách icon. |

## 2. Đối chứng hoàn thành

- **0** `alert()`, **0** `console.log`/`console.error` trong scope A0b. (Còn lại 1 `console.error` sẵn tại `src/lib/api.ts` — thuộc lane A0, không được sửa.)
- **0** `TODO`, `FIXME`, nội dung placeholder (dummy), **0** nút bấm rỗng.
- **0** import không tồn tại; `./node_modules/.bin/tsc --noEmit` không báo lỗi ở file mới (các lỗi còn lại: `stock-alerts`, `orders/[trackingCode]`, `settings`, `labels.ts`, `mock/store.ts` — đã có từ trước, A0b không xử lý).
- Bảng "Việc cần xử lý" trên dashboard: đầy đủ 4 trạng thái.
- Demo role switcher redirect về đúng route theo vai trò. Các route này đã có trong `Sidebar` (`Tổng quan`, `Điều phối`, `Chuyến của tôi`).

## 3. Lỗi / thiếu / sai sót phát hiện

1. **`src/app/demo/page.tsx`** (Ch. 11): liên kết "Mở Pack Station" trỏ về `http://localhost:4004/pack` — host đường dev cũ, trang Pack Station chạy một Next.js app khác nên link này chết. Cần chuyển sang địa chỉ deploy của Pack Station (lane A5).
2. **`src/lib/api.ts:37`** — `console.error('Failed to parse tenant_user from localStorage:', e)` (lane A0).
3. **`packages/ui-components`** (`Input`, `Modal`) — đang dùng màu legacy `bg-white`, `border-slate-200`, `text-sm`, `rounded-xl`, `shadow-xl` cho Modal. Đây là định dạng framework chung, nằm ngoài phạm vi sửa của A0b.
4. `src/components/ai/AIFeedbackModal.tsx` chưa được gọi bởi trang nào (dead code) sau khi dùng `Modal` vào.

## 4. Phần chưa làm được (do lane)

- Các trang bảng khác (orders, inventory, finance, admin, logistics...) chưa wrap `TableState` — thuộc lane A1/A2/A3/A4.
- `src/lib/**` (mock, mock-auth, permissions, labels) bị đóng băng, không được sờ.
- Không thể thông báo các sửa đổi chủng lớp bảng của lane A1–A3 mà không report.

## 5. Hướng đi tiếp (nên report cho lane A0)

1. Báo `src/lib/api.ts` `console.error` cần chuyển sang toast (`ToastHost`) — A0 lane.
2. Báo `packages/ui-components` `Modal`/`Input` legacy styling cho việc migration gói primitives (thay `bg-white` → `bg-surface`, v.v.).
3. Demo page `http://localhost:4004/pack` cần một link Pack Station deploy của lane A5.
