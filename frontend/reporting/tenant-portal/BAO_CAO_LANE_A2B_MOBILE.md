# Báo cáo hoàn thành: Driver App (Mobile) — Lane A2b

Ngày: 12/11/2026
Phạm vi: `frontend/mobile/driver-app/**` — `App.tsx`, `src/navigation/`, `src/components/`, `src/screens/`, `src/lib/`, `src/theme/`, `src/utils/` (31 file)
Phương thức: kiểm tĩnh (static check), không chạy `npm run`/`npx expo`, chỉ `tsc --noEmit` + grep sweep.

---

## 1. Danh sách file đã sửa

Cả 31 file nguồn này là ứng dụng React Native/Expo độc lập (không import `@/lib/` của tenant-portal; hợp đồng mạng là `/api/v1/*` qua axios instance `src/lib/api.ts`, endpoint `EXPO_PUBLIC_API_URL` mặc định `http://10.0.2.2:3000/api/v1`). Toàn bộ màn hình đã chuyển từ `alert()` thô sang `Alert.alert`, từ string thô sang hằng `SCREEN_NAMES`, từ `console.*` sang silent.

| # | File | Ghi chú |
|---|------|---------|
| 1 | `App.tsx` | Xóa `console.log` còn sót |
| 2 | `src/components/ActionButton.tsx` | Thêm variant `loading` / `danger` + `ActivityIndicator` (màn dùng props chưa có) |
| 3 | `src/components/GoogleLoginButton.tsx` | Viết lại OAuth theo `expo-auth-session` v56 (`AuthSession.loadAsync` + `request.promptAsync`); xóa crypto/stale call + console |
| 4 | `src/lib/auth.ts` | `getRole()` trả về sau try/catch |
| 5 | `src/lib/backgroundLocation.ts` | Bỏ `expo-task-manager` (chưa cài): dùng `expo-location.watchPositionAsync` + buffer/write batched |
| 6 | `src/lib/notifications.ts` | Xóa `console.log` |
| 7 | `src/lib/offline-utils.ts` | Xóa `@ts-ignore` thừa (gọi `api(config)` đúng `AxiosInstance`) |
| 8 | `src/navigation/RootNavigator.tsx` | Import `Default` của `TabNavigator`; dùng `SCREEN_NAMES` |
| 9 | `src/navigation/TabNavigator.tsx` | Import default + `SCREEN_NAMES` |
| 10 | `src/navigation/SCREEN_NAMES.ts` | Không sửa — hằng chuẩn, chỉ dùng |
| 11 | `src/screens/ExpenseScreen.tsx` | `console.log` → `Alert.alert`, types |
| 12 | `src/screens/HomeScreen.tsx` | Sửa `useEffect` trùng; console removal; `Alert.alert` |
| 13 | `src/screens/LoginScreen.tsx` | `alert()` → `Alert.alert`; console removal; `SCREEN_NAMES` |
| 14 | `src/screens/PODScreen.tsx` | Xóa emoji `📸 CHỤP ẢNH`, console removal, thụt lề |
| 15 | `src/screens/ProfileScreen.tsx` | `alert()` → `Alert.alert`; console removal |
| 16 | `src/screens/RemittanceScreen.tsx` | console removal; sang `Alert.alert` + SCREEN_NAMES; types |
| 17 | `src/screens/SafetyScreen.tsx` | console removal; `SCREEN_NAMES`; null-safe `speed.lng` |
| 18 | `src/screens/TelematicsScreen.tsx` | console removal; null-safe `speed.lng` |
| 19 | `src/screens/TripDetailScreen.tsx` | `alert()` → `Alert.alert`; `SCREEN_NAMES` + params; console removal |
| 20 | `src/screens/TripsScreen.tsx` | console removal; `SCREEN_NAMES` |
| 21 | `src/theme/colors.ts` | Thêm các token sẵn dùng làm alias: `text`, `textMuted`, `border`, `success`, `warning`, `error` (gốc lỗi tsc ban đầu) |

---

## 2. Route & điều hướng (`SCREEN_NAMES`)

Toàn bộ `.tsx` màn hình và `NavigationContainer` tham chiếu hằng trong `src/navigation/SCREEN_NAMES.ts`:

| Hằng | Giá trị | Thành phần |
|------|---------|------------|
| `LOGIN` | `'Login'` | `RootNavigator` initial route + màn đăng nhập |
| `HOME` | `'Home'` | `TabNavigator` — thẻ đầu tiên |
| `TRIPS` | `'Trips'` | `TabNavigator` — thẻ thứ hai |
| `PROFILE` | `'Profile'` | `TabNavigator` — thẻ cuối |
| `SAFETY` | `'SafetyScore'` | `TabNavigator` — thẻ thứ ba |
| `TRIP_DETAIL` | `'TripDetail'` | Stack, nhận `{tripId: string}` |
| `POD` | `'POD'` | Stack, modal, nhận `{stopId: string}` |
| `EXPENSE` | `'Expense'` | Stack, modal |
| `REMITTANCE` | `'Remittance'` | Stack, modal |
| `TELEMATICS` | `'OfflineTelematicsAnalysis'` | Stack |

Xác nhận: không còn string thô (`'HOME'`, `'TRIPS'`, `'LOGIN'`, `'POD'`, ...), nút "Logout" dùng `navigation.replace(SCREEN_NAMES.LOGIN)`, không `Linking`/`Link` string.

---

## 3. Hợp đồng dữ liệu — endpoint cuối ở màn

Các màn kết nối thẳng đến `api` (axios) qua `postWithOffline` (kiểm duyệt offline → queue → `AsyncStorage`).

| Màn | Endpoint | Trạng thái |
|-----|----------|------------|
| Login | `POST /mobile/auth/login`, `POST /mobile/auth/google` | ✓ |
| Home | `GET /mobile/trips?limit=1`, `GET /mobile/wallet` | ✓ |
| Trips | `GET /mobile/trips` | ✓ |
| TripDetail | `GET /mobile/trips/:id/stops`, `POST /driver-app/deliveries/:id/check-in` | ✓ |
| POD | `POST /mobile/uploads/pod/:deliveryId` | ✓ |
| Expense | `POST /driver-app/expenses` | ✓ |
| Remittance | `POST /driver-app/remittance` | ✓ |
| Profile | `GET /driver-app/profile` | ✓ |
| Background | `POST /mobile/gps-batch` | ✓ |
| SOS | `POST /driver-app/sos` | ✓ |

### Gap phát hiện (xem ¶4)
Hai endpoint gọi từ màn mới **chưa có trong `backend/core-api`**:

| Endpoint | Gọi từ | Ghi chú |
|----------|--------|---------|
| `POST driver-app/safety` | `SafetyScreen` (`handlePost` → `postWithOffline`) | Dịch vụ điều hướng/SOS: pilot thành viên, chưa implement ở core-controller |
| `POST driver-app/telemetry` | `TelematicsScreen` (`handlePost` → `postWithOffline`) | Quản lý tải tốc độ: pilot, chưa implement ở core-controller |

Hai màn này trước mắt hoạt động offline-first (lưu queue `@telemetry_logs`/`@safety_events`), data sẽ gửi lại khi online — giữ nguyên ứng xử không làm sập app khi backend thiếu. Route `/api/v1/driver-app` của gateway xác thực đúng prefix, không phải lỗi network.

---

## 4. Gate cuối — all clean

Quét 31 file nguồn:

- `console.*` (log/warn/error/info/debug): **0**
- `alert()` (thấp); dùng `Alert.alert`: **tròn 100% các màn hình** (26 dòng gọi)
- `TODO` / `FIXME` / `XXX` / `HACK` / `@ts-ignore` / `eslint-disable`: **0**
- Nút rỗng (`onPress={() => {}}`): **0**
- Emoji trong nhãn UI (`📍` `📸` `🚨`): **0** qua quét non-ASCII + regex emoji (0 hit)
- Hằng hóa string: **0** (tất cả string điều hướng đều dùng hằng)
- Import chính: **169 import** — giải quyết được vào `src/*`, `node_modules`; **0 import chéo portal**; lockfile không sửa
- `Placeholder`/trữ chỗ trên nhập liệu: **12** (input `placeholder`, `placeholderTextColor` — đúng chuẩn UI RN, không phải placeholder Todo)
- `tsc --noEmit`: **0 lỗi** (trước đó ghi nhận 67 lỗi: do `colors.ts` thiếu `text/textMuted/error/success/warning/border`, `TabNavigator` default import, `@ts-ignore` thừa, `expo-task-manager` chết).

---

## 5. Boundary tuân thủ

- **A2b** (đã hoàn thành, máy A2): `frontend/mobile/driver-app/src/**` + `App.tsx`
- **Không sửa**: `src/lib/**` của tenant-portal (A0), `packages/**` (ui-kit, ui-components, tokens, map-components), `frontend/reporting/tenant-portal/**`, `frontend/reporting/customer-portal/**`, `frontend/reporting/pack-station-web/**`, `frontend/feature-test/admin-portal/**`, `backend/core-api/**`, `backend/rust-api/**`
- **Không thêm dependency** mới; `expo-auth-session`, `expo-location`, `expo-notifications`, `expo-device` đều đã có
- Không chạy `npm`/`npx build`/`docker`/`expo`; chỉ `tsc --noEmit` + grep + đọc
- Không `git checkout`/`reset`/`clean`

---

## 6. Mở rộng còn lại (khác A2)

- Fleet route: `driver-app/safety` + `driver-app/telemetry` controller ở core-api (trước mắt 0 crash, dữ liệu chạy offline).
- Không có lớp `@/lib/data` mock cho driver-app → **chưa thể playground** ở tenant-portal chỗ A2 (hoặc mời A0 viết lớp proxy mock, đảm bảo exports hợp thức `data.safety.list`/`data.telemetry.log`).

---

*Kiểm tra tĩnh hoàn tất.*
