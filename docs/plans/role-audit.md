# Báo cáo rà soát vai trò (Role Audit) — SmartLogi

> Ngày: 2026-11-12 · Phạm vi: `frontend/reporting/tenant-portal/**`
> Mục tiêu: tìm "chồng chéo chức năng giữa các role" — nhiều role cùng thao tác, cùng route,
> cùng hành động ghi — và đề xuất thu hẹp.

---

## 1. Cấu trúc hiện tại

- **8 AppRole**: `SUPER_ADMIN`, `TENANT_ADMIN`, `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`,
  `LOGISTICS_MANAGER`, `DRIVER`, `CUSTOMER_CLIENT`, `TENANT_USER`
- **13 PermissionAction** (tất cả `:write`):
  `order:write, wave:write, inventory:write, trip:write, sos:write, cod:write, expense:write,
  return:write, ai:write, client:write, user:write, apikey:write, settings:write`
- Bảng quyền giả lập: `src/lib/permissions.ts` (MATRIX + ROUTE_ACCESS)
- Nguồn thật: `packages/shared-types/src/role-permission-map.ts` (dạng `roles:manage`, `mobile:sos`...)
- Mock seed (`src/lib/mock/seed.ts`): **chỉ có 6 roles**, permission keys miền riêng biệt.
- `packages/shared-types/src/roles.ts` định nghĩa 8 role keys khớp (`SUPER_ADMIN`, `TENANT_USER`, ...) — trung tâm.

### Ma trận hành động ghi (từ `permissions.ts`)

| Role | Hành động ghi |
|---|---|
| `SUPER_ADMIN` | 13/13 (toàn quyền) |
| `TENANT_ADMIN` | 13/13 (toàn quyền) |
| `WAREHOUSE_MANAGER` | `order:write`, `wave:write`, `inventory:write`, `return:write`, `expense:write` |
| `WAREHOUSE_STAFF` | `inventory:write`, `wave:write` |
| `LOGISTICS_MANAGER` | `order:write`, `trip:write`, `sos:write`, `cod:write`, `expense:write`, `return:write` |
| `DRIVER` | `cod:write` |
| `CUSTOMER_CLIENT` | `order:write`, `return:write` |
| `TENANT_USER` | **0 hành động** |

### Phạm vi route (từ `permissions.ts`)

| Role | Route xem được |
|---|---|
| `SUPER_ADMIN`, `TENANT_ADMIN` | `['*']` — toàn bộ |
| `WAREHOUSE_MANAGER` | demo, dashboard, notifications, profile, orders, inventory, wms, warehouses, logistics/returns, logistics/expenses, finance/reports, admin/ai-insights |
| `WAREHOUSE_STAFF` | demo, dashboard, notifications, profile, orders, inventory, wms |
| `LOGISTICS_MANAGER` | demo, dashboard, notifications, profile, orders, logistics, drivers, finance/cod, finance/reports, warehouses, admin/ai-insights |
| `DRIVER` | demo, dashboard, notifications, profile, drivers/my-trips, logistics/sos |
| `CUSTOMER_CLIENT` | demo, dashboard, notifications, profile, orders |
| `TENANT_USER` | demo, dashboard, notifications, profile, orders, inventory |

### Bảo vệ trang (RoleGuard)

- Chỉ 2 trang admin: `admin/audit-logs`, `admin/api-keys` dùng `RoleGuard`.
- 12 trang khác **mở trực tiếp**: users, roles, settings, branches, clients, billing,
  ai-insights, notifications, profile, finance/cod, finance/reports.
- `Can.tsx` (35 dòng, dùng `user.permissions`) **chưa được import ở đâu** — component chết.
- `ROLE_REDIRECT` được định nghĩa 3 bản copy giống hệt (`login/page.tsx`, `components/ui/GoogleLoginButton.tsx`, `components/DemoRoleSwitcher.tsx`).

---

## 2. Chứng cớ chồng chéo chức năng

### 2.1 Trùng hoàn toàn
- **`SUPER_ADMIN` == `TENANT_ADMIN`**: cùng 13/13 hành động, cùng `['*']` route access. Hai role
  này làm y hệt một chức năng: quản trị tenant. Chỉ khác tên.
- **`/orders`**: 6 role cùng nhìn danh sách toàn bộ đơn của tenant
  (`WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`, `LOGISTICS_MANAGER`, `DRIVER`, `CUSTOMER_CLIENT`,
  `TENANT_USER`). `DRIVER` không cần xem đơn (chỉ xem chuyến — `drivers/my-trips`).
- **`/inventory`**: `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`, `TENANT_USER`.

### 2.2 Hành động ghi đa nhân
- `order:write` → 3 role (WAREHOUSE_MANAGER, LOGISTICS_MANAGER, CUSTOMER_CLIENT)
  → khách hàng B2B và logistics cùng tạo đơn vận chuyển.
- `return:write` → 2 role (WAREHOUSE_MANAGER, LOGISTICS_MANAGER) → cả 2 cùng thu hồi đơn hoàn lại.
- `expense:write` → 2 role (WAREHOUSE_MANAGER, LOGISTICS_MANAGER)
- `inventory:write` / `wave:write` → 2 role (WAREHOUSE_MANAGER, WAREHOUSE_STAFF)
- `cod:write` → 2 role (LOGISTICS_MANAGER, DRIVER)

### 2.3 Vai trò trống / vô dụng
- `TENANT_USER`: **0 hành động**, không thể tạo/sửa gì; route access lại mặc định cho đọc.
  Thực tế: không dùng. Nên cho quyền xem `orders`/`inventory` ở mức read-only,
  hoặc rút về `order:self` nếu là khách.
- Mock `roleRows` seed chỉ 6 roles (thiếu `SUPER_ADMIN`, `TENANT_USER`) → trang `users`,
  `roles` (import `AppRole`) bị `undefined` khi `filter` theo `definitions` (`memberCount`).

### 2.4 Hai nguồn quyền khác biệt
- Frontend MATRIX dùng `order:write`, `wave:write`...; backend `role-permission-map` dùng
  `orders:create`, `orders:read`, `tasks:read`... → hai model quyền khác schema.
- Không thể tự domain quy chuẩn hóa mà không động vào `src/lib/**` (A0).

### 2.5 Lỗ an ninh khi truy cập trực tiếp
- 12 trang admin/finance có thể truy cập trực tiếp qua URL bởi bất kỳ role nào đang đăng nhập,
  vì Sidebar lọc route nhưng không check trang.

---

## 3. Đề xuất (ưu tiên thu hẹp chồng chéo)

### A. Thu hẹp ma trận hành động (lane A0 — `src/lib/permissions.ts` do A0 sửa)
| Hành động | Vai trò được phép (dự kiến) | Ghi chú |
|---|---|---|
| `order:write` | `LOGISTICS_MANAGER` | Khách/warehouse chỉ yêu cầu (trang logistics) |
| `return:write` | `LOGISTICS_MANAGER` | Trả về ngoại lệ logistics |
| `expense:write` | `LOGISTICS_MANAGER` | Chi phí vận tải |
| `cod:write` | `DRIVER`, `LOGISTICS_MANAGER` | Driver nộp COD, logistics quyết toán |
| `sos:write` | `LOGISTICS_MANAGER`, `DRIVER` | Báo SOS |
| `trip:write` | `LOGISTICS_MANAGER` | |
| `wave:write` | `WAREHOUSE_MANAGER` | Wave do quản lý kho phát |
| `inventory:write` | `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF` | Giữ 2 bên |
| `ai:write` | `SUPER_ADMIN`, `TENANT_ADMIN` | |
| `client:write`, `user:write`, `apikey:write`, `settings:write` | `SUPER_ADMIN`, `TENANT_ADMIN` | |

### B. Thu hẹp route (lane A0)
- `/orders`: `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`, `LOGISTICS_MANAGER`, `SUPER_ADMIN`, `TENANT_ADMIN`. Xóa `DRIVER`, `CUSTOMER_CLIENT`, `TENANT_USER` (khách ngồi `customer-portal`, driver ngồi `drivers/my-trips`).
- `/inventory`: `WAREHOUSE_MANAGER`, `WAREHOUSE_STAFF`, `SUPER_ADMIN`, `TENANT_ADMIN`.
- `/warehouses`: `WAREHOUSE_MANAGER`, `LOGISTICS_MANAGER`, `SUPER_ADMIN`, `TENANT_ADMIN`.
- `/finance/reports`: `LOGISTICS_MANAGER`, `WAREHOUSE_MANAGER`, `SUPER_ADMIN`, `TENANT_ADMIN`.
- `TENANT_USER`: hiện 0 action → giữ route `/dashboard`, `/notifications`, `/profile`, `/orders`(xem), `/inventory`(xem), xóa quyền ghi.

### C. Vai trò SUPER_ADMIN / TENANT_ADMIN: định nghĩa lại phân biệt
- `SUPER_ADMIN`: đa tenant, super quyền trên tất cả tenant (nếu dự án sau nầy).
- `TENANT_ADMIN`: admin duy nhất của tenant này. Không nên `['*']` hay 13/13 — để
  `super` ấn biệt (ví dụ `ai:write`, `client:write`, `user:write`, `apikey:write`, `settings:write` là `super`).
- Cách sửa: chỉ cần EMAIL bằng role (ít nhất current demo).

### D. Sửa lỗi A1-A3 (làm ngay)**
1. **RoleGuard 12 trang admin/finance** (chỉ edit `src/app/**`):
   - `users`, `roles`, `settings`, `branches`, `profile`: `['SUPER_ADMIN', 'TENANT_ADMIN']`
   - `ai-insights`: `['SUPER_ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_MANAGER']`
   - `notifications`, `finance/cod`, `finance/reports`, `billing`, `clients`: role tương ứng
2. **Gating button-write trong trang**: `Tạo đơn` ở `orders/page.tsx` (chỉ BOOL khi `can('order:write')`)
3. **Xóa `Can.tsx`** (dead code)
4. **Unify `ROLE_REDIRECT`**: tạo 1 map duy nhất (bao gồm định vào `DemoRoleSwitcher`, `login`, `GoogleLoginButton`) — báo A0 tạo `src/lib/role-redirect.ts`? Hoặc tạo trong components? Cần A0 nếu không.
5. **Mock seed roles**: thêm `SUPER_ADMIN`, `TENANT_USER` vào `roleRows` (A0: `src/lib/mock/seed.ts`)
6. **`TENANT_USER`**: thêm `['order:read', 'inventory:read']` vào ma trận (A0), để role người xem thực non?

### E. Xác nhận cấu trúc `permission` backend
Chuẩn hóa mock permission keys → `PermissionAction` mau A0 làm.

---

## 4. Tuyên bố
- Không đụng `src/lib/**` tenant-portal (A0), `packages/**` — báo cáo A0 sửa.
- Các sửa_page `src/app/**` (`ROLEGuard`, button gate, xóa dead code) → làm ngay khi thông qua.
- Report ngay user nếu phát sinh cần mở rộng A0.
