"""
DEPRECATED: This file is a legacy script superseded by train_demand.py,
delivery_time.py, anomaly_detection.py, churn_prediction.py, and pretrain_all.py.
Use POST /ai/v1/train/* endpoints or run pretrain_all.py instead.
Kept for reference only - will be removed in a future cleanup.
"""

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from data_loader import load_order_history

MODEL_DIR = "models"
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

def run_actual_training():
    print(" ĐANG THỰC HIỆN HUẤN LUYỆN AI THỰC TẾ TRÊN 2,000 BẢN GHI...")
    
    # 1. Load Data từ Public Schema (Nơi chứa 2,000 bản ghi mẫu)
    try:
        df = load_order_history("tenant") # Seeding đã đổ vào schema 'tenant'
        if len(df) < 50:
            print(" Dữ liệu quá ít, đang thử schema public...")
            df = load_order_history("public")
    except Exception as e:
        print(f"❌ Lỗi load data: {e}")
        return

    print(f"📊 Đã nhận diện {len(df)} đơn hàng mẫu.")

    # 2. Tiền xử lý
    # X: Thứ (0-6), Giờ (0-23), Số lượng items
    # y: Tổng khối lượng (kg)
    X = df[['day_of_week', 'hour', 'item_count']]
    y = df['total_weight_kg']

    # 3. Chia tập dữ liệu (80% học, 20% kiểm tra)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 4. Huấn luyện (Random Forest - Học máy rừng ngẫu nhiên)
    print("🧠 AI đang học quy luật biến động đơn hàng...")
    model = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    # 5. Đánh giá chất lượng
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    
    # Tính Accuracy tương đối (100% - tỷ lệ lỗi)
    avg_weight = y.mean()
    accuracy = 100 - (mae / (avg_weight + 1) * 100)

    # 6. Lưu Model
    model_path = os.path.join(MODEL_DIR, "production_demand_v1.joblib")
    joblib.dump(model, model_path)

    print("✨ HUẤN LUYỆN HOÀN TẤT!")
    print(f" Model Version: v1.0.0")
    print(f"🎯 Độ chính xác dự báo (Accuracy): {round(accuracy, 2)}%")
    print(f"📉 Sai số trung bình (MAE): {round(mae, 2)} kg")
    print(f"📂 Đường dẫn file não bộ: {model_path}")

if __name__ == "__main__":
    run_actual_training()
