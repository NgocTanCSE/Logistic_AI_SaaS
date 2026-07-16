---
title: SmartLogi AI SaaS
emoji: 🚛
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# 🚛 SmartLogi AI SaaS - Logistics Platform

Hệ thống quản lý Logistics tích hợp Trí tuệ nhân tạo (AI) đa nền tảng, hỗ trợ Multi-tenancy, Quản lý kho (WMS), Điều phối vận tải (TMS) và Tự động hóa trạm đóng gói.

---

## 🚀 Tính năng nổi bật (Elite Standard)

1.  **Core System**: Kiến trúc Microservices (NestJS, Go, Python) chạy qua Kong Gateway. Hỗ trợ tách biệt Schema dữ liệu cho từng khách hàng (Multi-tenancy).
2.  **WMS Engine**: 
    *   Thuật toán cấp phát hàng hóa thông minh (FIFO, FEFO, LIFO).
    *   Tích hợp phần cứng: Đọc cân điện tử (Web Serial API) và PDA Laser Scanner.
3.  **Logistics & Maps**:
    *   Geocoding địa chỉ khách hàng chính xác 100% (OSM).
    *   Dispatch Tower: Bản đồ Leaflet tương tác, hiển thị lộ trình thực tế.
4.  **AI Services (SAI Core)**:
    *   **VRP Solver**: Tối ưu lộ trình đa xe sử dụng Google OR-Tools.
    *   **Self-Learning**: Vòng lặp phản hồi (Feedback Loop) cho phép con người đánh giá và máy tự học lại.
5.  **Robustness**: 
    *   Optimistic Locking (chống ghi đè dữ liệu).
    *   Offline Sync cho ứng dụng tài xế.
    *   Bảo mật phân quyền đến từng nút bấm (Granular RBAC).

---

## 🛠 Yêu cầu hệ thống

*   **Docker & Docker Compose** (Khuyến nghị)
*   **Node.js v20+** & **pnpm**
*   **Python 3.10+** (cho AI Service)
*   **Go 1.21+** (cho GPS Ingestion & Webhook)

---

## 📦 Hướng dẫn cài đặt nhanh

### 1. Khởi chạy Infrastructure
Sử dụng Docker Compose để dựng Database, Redis, Kafka và Kong Gateway:

```bash
docker-compose up -d
```

### 2. Cài đặt Dependencies (Mono-repo)
Tại thư mục gốc, chạy lệnh pnpm để cài đặt cho toàn bộ workspace:

```bash
pnpm install
```

### 3. Cấu hình Biến môi trường (Environment Variables)
Copy file `.env.example` thành `.env` trong các thư mục sau và cập nhật thông số:
*   `services/iam-service/.env`
*   `services/logistics-service/.env`
*   `apps/admin-portal/.env.local`
*   `apps/tenant-portal/.env.local`

### 4. Khởi chạy toàn bộ hệ thống
Dùng lệnh song song của pnpm để chạy các service và frontend:

```bash
pnpm dev
```

---

## 📁 Cấu trúc thư mục (Project Structure)

*   `apps/`: Các ứng dụng Frontend (Next.js).
    *   `admin-portal`: Dành cho chủ nền tảng SaaS.
    *   `tenant-portal`: Dành cho khách hàng (Quản lý kho & Vận tải).
*   `services/`: Các Microservices Backend.
    *   `iam-service`: Xác thực, phân quyền (NestJS).
    *   `inventory-service`: Quản lý kho, tồn kho (NestJS).
    *   `logistics-service`: Điều phối, tài chính (NestJS).
    *   `ai-service`: Lõi xử lý AI (Python/FastAPI).
    *   `gps-ingestion-service`: Nhận dữ liệu tọa độ (Golang).
*   `packages/`: Các thư viện dùng chung (Logic, UI, Types).
    *   `wms-engine`: Lõi thuật toán kho.
    *   `map-components`: Thư viện bản đồ tương tác.
    *   `shared-types`: Định nghĩa Role/Permission toàn hệ thống.

---

## 🛡 Bảo mật & Phân quyền (RBAC)

Hệ thống sử dụng cơ chế bảo mật 2 lớp:
1.  **Backend Guard**: Kiểm tra JWT và Permission tại mọi Endpoint.
2.  **Frontend Can Component**: 
    ```tsx
    <Can permission="inventory:adjust">
       <Button>Chốt đơn & Đóng gói</Button>
    </Can>
    ```

---

## 🧪 Kiểm thử (Testing)

Chạy Unit Test cho logic kho:
```bash
cd packages/wms-engine
pnpm test
```

---

## 📝 Liên hệ & Hỗ trợ
Dự án được xây dựng theo tiêu chuẩn **SmartGen AI 2026**. Để được hỗ trợ kỹ thuật, vui lòng liên hệ đội ngũ quản trị hệ thống.

**SmartLogi - Hậu cần thông minh, vận hành tối ưu.**
