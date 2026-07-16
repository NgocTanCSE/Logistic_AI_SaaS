import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from data_loader import load_delivery_history, get_db_connection, return_db_connection, validate_schema_name

logger = logging.getLogger("ai-service.delivery_time")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "models")
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)


def train_delivery_time_model(tenant_id, schema_name):
    if not validate_schema_name(schema_name):
        return {"ok": False, "error": "Invalid schema name"}

    logger.info(f"Training delivery time model for Tenant: {tenant_id}...")

    df = load_delivery_history(schema_name)
    if len(df) < 30:
        return {"ok": False, "error": "Insufficient delivery data (min 30 records)"}

    if 'delivery_duration_minutes' not in df.columns:
        return {"ok": False, "error": "No delivery duration data available"}

    df = df[df['delivery_duration_minutes'] > 0]
    df = df[df['delivery_duration_minutes'] < df['delivery_duration_minutes'].quantile(0.99)]

    if 'created_at' in df.columns:
        df['day_of_week'] = df['created_at'].dt.dayofweek
        df['hour'] = df['created_at'].dt.hour
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    else:
        df['day_of_week'] = 0
        df['hour'] = 12
        df['is_weekend'] = 0

    feature_columns = ['day_of_week', 'hour', 'is_weekend']
    available_features = [f for f in feature_columns if f in df.columns]

    X = df[available_features]
    y = df['delivery_duration_minutes']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    model_version = f"v{int(pd.Timestamp.now().timestamp())}"
    model_name = f"delivery_time_{tenant_id}_{model_version}.joblib"
    model_path = os.path.join(MODEL_DIR, model_name)
    joblib.dump(model, model_path)

    metadata = {
        "features": available_features,
        "metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
        },
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_type": "GradientBoostingRegressor",
    }

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                INSERT INTO "{schema_name}"."ai_models"
                (id, name, version, type, accuracy, model_path, trained_at, is_current, metadata)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), true, %s)
            """, (
                f"Delivery-Time-{tenant_id}",
                model_version,
                "DELIVERY_TIME",
                float(max(0, r2 * 100)),
                model_path,
                json.dumps(metadata)
            ))

            cur.execute(f"""
                UPDATE "{schema_name}"."ai_models"
                SET is_current = false
                WHERE type = 'DELIVERY_TIME' AND version != %s
            """, (model_version,))

        conn.commit()
    except Exception as e:
        logger.error(f"Error persisting delivery time model: {e}")
    finally:
        return_db_connection(conn)

    return {
        "ok": True,
        "version": model_version,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "model_path": model_path
    }


def predict_delivery_time(model_path, day_of_week, hour, is_weekend):
    model = joblib.load(model_path)
    features = [[day_of_week, hour, is_weekend]]
    prediction = model.predict(features)
    return round(float(prediction[0]), 2)


if __name__ == "__main__":
    result = train_delivery_time_model("demo-tenant", "public")
    logger.info(f"Training result: {result}")
