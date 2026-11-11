# Bao cao kiem tra tinh - Lane A2 (TMS & doi xe)

Pham vi: `frontend/reporting/tenant-portal/src/app/logistics/**`, `src/app/drivers/**`, `src/app/warehouses/**`.
Thuc hien: quet tĩnh code, xac nhận chế do du lieu mock/api, hop dong UI (4 trang thai bang, MapCanvas, labels).
Thuc hien ngay: 2026-11-12.

---

## 1. Nhung file da sua

### 1.1 `src/app/logistics/dispatch/page.tsx`
- **Tai `dynamic()` + `LeafletMap`.** File nay import `next/dynamic` va `import('map-components')` — `map-components` khong nam trong danh muc dependency duoc phep, va LeafletMap khong ho tro cac glyph can thiêt (trang thai xe bang BorderedIcon rieng).
- **Thay bang `MapCanvas`** tu `@/components/demo/MapCanvas` — thanh phan duy nhat duoc phep hien thi ban do:
  - Props: `markers=[tripMarkers]`, `polylines=[tripRoutes]`, `vehicles=[fleetVehicles]`, `controls`.
  - Builder `useMemo` nhan `trips`/`vehicles` tu `data` (mock), tra ve mang `MapMarker`/`MapPolyline`/`MapVehicle` da luu y kieu.
  - Do tre gia lap duoc bao toan qua `useEffect` (200ms) tren ba danh muc: marker, polyline, vehicle.
- Bang don hang bo sung (d− qui ban do) van dung `TableState` voi du 4 trang thai va `Pagination`.

### 1.2 `src/app/logistics/geofences/page.tsx`
- **Them `validateForm()`** phuc vu submit thay cho `setError` truoc tiet:
  - `name`: bat buoc, toi da 100 ky tu.
  - `kind`: bat buoc (Polygons / Kho / Tinh).
  - `province`: bat buoc.
  - `centerLat`: `-90..90`, toi thieu 2 ky tu so.
  - `centerLng`: `-180..180`, toi thieu 2 ky tu so.
  - `radiusM`: bat buoc, `>0` va `<=50.000` met.
  - `note`: tu do, toi da 300.
- C cac loi tung tr− ớng hiển thi ngay duoi input tuong ng (`formErrors.name`, ...), an dan khi ng− i durng gõ (`clearError`).
- `error` prop duoc truyen vao **ca 7 tr− ớng** (name, kind, province, centerLat, centerLng, radiusM, note).

### 1.3 `src/app/logistics/sos/page.tsx`
- Xoa dòng tran kép truóc `load` (chuan hoa xuong file).
- Luong xac nhan: `acknowledge` rói `resolve`; neu ch− a "chap nhan" thi mock day loi "Phai tiep nhan canh bao truoc khi dong." — UI hiển thi loi thay vi ném mac dinh.

---

## 2. Ket qua quet (sai sót tim duoc)

- `console.log`, `alert(`, `TODO`, `FIXME`, `dynamic`, `import('map-components')`, `Leaflet`: **chẵn 0** trong pham vi.
- Tat ca bang danh sách trong pham vi (dispatch, control-tower, optimize, expenses, reports, vehicles, warehouses, warehouses/[id]/bins, vehicles/[id]/fuel, vehicles/[id]/maintenance, trips/[id]/pod, drivers, drivers/[id]/ranking, drivers/[id]/trip-log, drivers/my-trips) deu dung `DataState`/`TableState` voi **4 trang thai** (loading, rong, loi, co du lieu) va `onRetry`.
- Khong import chéo giu cac portal. Khong import file khong ton tai. Khong dung component chua duoc export.
- Placeholder tren input la chuan UI (`placeholder="..."`), không tinh la "placeholder bo lai".

---

## 3. Phan chua lam duoc / phat hien khac

- **Khong tao route mới**, nen sidebar không can dieu chinh.
- **Khong co giao dien tao/sua tai xe va phuong tien** (doc ghi don thuần). Mock repo (`src/lib/mock/store.ts`) ho tro toan bo CRUD qua `data.drivers.*`/`data.vehicles.*`, nhung page A2 chi liet ke + chitiet/ranking/bang phan tich.
- **Xe con online/offline**: hiển thi dung trang thai status tu tr− ớng Vehicle, mau trang thai da chuan.
- **`MapCanvas`**: chi chap nhan `markers`/`polylines`/`vehicles` props, da ap dung dung.

---

## 4. Ket thuc

- Da loai bo `map-components` (Leaflet) khoi `logistics/`.
- Da hoan tat xac nhân 4 trang thai bang cho moi bang liet ke.
- Khong tao them dependency, khong sua `src/lib/**` (thuoc A0 suo khac).

---
*Lan: A2 (TMS & doi xe). Pham vi: logistics, drivers, warehouses.*
