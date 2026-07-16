import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from data_loader import load_order_history, get_db_connection, return_db_connection, validate_schema_name

logger = logging.getLogger("ai-service.train_demand")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "models")
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)


def train_demand_model(tenant_id, schema_name):
    if not validate_schema_name(schema_name):
        return {"ok": False, "error": "Invalid schema name"}

    logger.info(f"Training model for Tenant: {tenant_id}...")

    df = load_order_history(schema_name)
    if len(df) < 50:
        return {"ok": False, "error": "Insufficient data to train (min 50 records)"}

    feature_columns = [
        'day_of_week', 'hour', 'item_count', 'month',
        'is_weekend', 'is_morning', 'is_afternoon', 'is_evening'
    ]

    available_features = [f for f in feature_columns if f in df.columns]
    X = df[available_features]
    y = df['total_weight_kg']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    accuracy = max(0, 100 - (mae / (y.mean() + 1) * 100))

    feature_importance = dict(zip(available_features, model.feature_importances_.tolist()))

    model_version = f"v{int(pd.Timestamp.now().timestamp())}"
    model_name = f"demand_model_{tenant_id}_{model_version}.joblib"
    model_path = os.path.join(MODEL_DIR, model_name)
    joblib.dump(model, model_path)

    metadata = {
        "features": available_features,
        "feature_importance": feature_importance,
        "metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "accuracy": round(accuracy, 2),
        },
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_type": "RandomForestRegressor",
    }

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"""
                INSERT INTO "{schema_name}"."ai_models"
                (id, name, version, type, accuracy, model_path, trained_at, is_current, metadata)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), true, %s)
            """, (
                f"Demand-Forecast-{tenant_id}",
                model_version,
                "FORECASTING",
                float(accuracy),
                model_path,
                json.dumps(metadata)
            ))

            cur.execute(f"""
                UPDATE "{schema_name}"."ai_models"
                SET is_current = false
                WHERE type = 'FORECASTING' AND version != %s
            """, (model_version,))

        conn.commit()
    except Exception as e:
        logger.error(f"Error persisting model info: {e}")
    finally:
        return_db_connection(conn)

    return {
        "ok": True,
        "version": model_version,
        "accuracy": round(accuracy, 2),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "features": available_features,
        "feature_importance": feature_importance,
        "model_path": model_path
    }


if __name__ == "__main__":
    result = train_demand_model("demo-tenant", "public")
    logger.info(f"Training result: {result}")
