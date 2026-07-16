import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from data_loader import get_db_connection, return_db_connection, validate_schema_name

logger = logging.getLogger("ai-service.anomaly_detection")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "models")
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)


def train_anomaly_model(tenant_id, schema_name):
    if not validate_schema_name(schema_name):
        return {"ok": False, "error": "Invalid schema name"}

    logger.info(f"Training anomaly detection model for Tenant: {tenant_id}...")

    conn = get_db_connection()
    try:
        query = f"""
        SELECT
            o.id,
            o.shipping_fee,
            o.cod_amount,
            o.created_at,
            o.status
        FROM "{schema_name}"."orders" o
        WHERE o.status != 'CANCELLED'
        """

        df = pd.read_sql(query, conn)

        if len(df) < 100:
            return {"ok": False, "error": "Insufficient data for anomaly detection (min 100 records)"}

        df['created_at'] = pd.to_datetime(df['created_at'])
        df['day_of_week'] = df['created_at'].dt.dayofweek
        df['hour'] = df['created_at'].dt.hour
        df['shipping_fee'] = df['shipping_fee'].astype(float)
        df['cod_amount'] = df['cod_amount'].astype(float)

        feature_columns = ['shipping_fee', 'cod_amount', 'day_of_week', 'hour']
        X = df[feature_columns].fillna(0)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1
        )
        model.fit(X_scaled)

        predictions = model.predict(X_scaled)
        anomaly_scores = model.decision_function(X_scaled)

        n_anomalies = (predictions == -1).sum()

        model_version = f"v{int(pd.Timestamp.now().timestamp())}"
        model_name = f"anomaly_{tenant_id}_{model_version}.joblib"
        model_path = os.path.join(MODEL_DIR, model_name)
        joblib.dump({"model": model, "scaler": scaler, "features": feature_columns}, model_path)

        metadata = {
            "features": feature_columns,
            "n_anomalies_detected": int(n_anomalies),
            "total_samples": len(df),
            "anomaly_rate": round(n_anomalies / len(df) * 100, 2),
            "model_type": "IsolationForest",
        }

        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO "{schema_name}"."ai_models"
            (id, name, version, type, accuracy, model_path, trained_at, is_current, metadata)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), true, %s)
        """, (
            f"Anomaly-Detection-{tenant_id}",
            model_version,
            "ANOMALY_DETECTION",
            float(100 - metadata["anomaly_rate"]),
            model_path,
            json.dumps(metadata)
        ))

        cur.execute(f"""
            UPDATE "{schema_name}"."ai_models"
            SET is_current = false
            WHERE type = 'ANOMALY_DETECTION' AND version != %s
        """, (model_version,))

        conn.commit()

        return {
            "ok": True,
            "version": model_version,
            "n_anomalies": int(n_anomalies),
            "anomaly_rate": metadata["anomaly_rate"],
            "model_path": model_path
        }

    except Exception as e:
        logger.error(f"Error training anomaly model: {e}")
        return {"ok": False, "error": str(e)}
    finally:
        return_db_connection(conn)


def detect_anomalies(model_path, data):
    loaded = joblib.load(model_path)
    model = loaded["model"]
    scaler = loaded["scaler"]
    features = loaded["features"]

    df = pd.DataFrame(data)
    X = df[features].fillna(0)
    X_scaled = scaler.transform(X)

    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)

    results = []
    for i, (pred, score) in enumerate(zip(predictions, scores)):
        results.append({
            "index": i,
            "is_anomaly": pred == -1,
            "anomaly_score": round(float(score), 4),
        })

    return results


if __name__ == "__main__":
    result = train_anomaly_model("demo-tenant", "public")
    logger.info(f"Training result: {result}")
