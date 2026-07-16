import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from data_loader import get_db_connection, return_db_connection, validate_schema_name

logger = logging.getLogger("ai-service.churn_prediction")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "models")
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)


def train_churn_model(tenant_id, schema_name):
    if not validate_schema_name(schema_name):
        return {"ok": False, "error": "Invalid schema name"}

    logger.info(f"Training churn prediction model for Tenant: {tenant_id}...")

    conn = get_db_connection()
    try:
        query = f"""
        SELECT
            o.client_id,
            o.id as order_id,
            o.created_at,
            o.shipping_fee,
            o.cod_amount,
            o.status
        FROM "{schema_name}"."orders" o
        WHERE o.client_id IS NOT NULL
        """

        df = pd.read_sql(query, conn)

        if len(df) < 50:
            return {"ok": False, "error": "Insufficient data for churn prediction (min 50 orders)"}

        df['created_at'] = pd.to_datetime(df['created_at'])
        df['shipping_fee'] = df['shipping_fee'].astype(float)
        df['cod_amount'] = df['cod_amount'].astype(float)

        client_stats = df.groupby('client_id').agg(
            total_orders=('order_id', 'count'),
            avg_order_value=('shipping_fee', 'mean'),
            total_cod=('cod_amount', 'sum'),
            last_order_date=('created_at', 'max'),
            first_order_date=('created_at', 'min'),
        ).reset_index()

        reference_date = df['created_at'].max()
        client_stats['days_since_last_order'] = (reference_date - client_stats['last_order_date']).dt.days
        client_stats['customer_lifetime_days'] = (client_stats['last_order_date'] - client_stats['first_order_date']).dt.days + 1
        client_stats['orders_per_month'] = client_stats['total_orders'] / (client_stats['customer_lifetime_days'] / 30 + 1)

        churn_threshold_days = 90
        client_stats['is_churned'] = (client_stats['days_since_last_order'] > churn_threshold_days).astype(int)

        feature_columns = [
            'total_orders', 'avg_order_value', 'total_cod',
            'days_since_last_order', 'customer_lifetime_days', 'orders_per_month'
        ]

        X = client_stats[feature_columns].fillna(0)
        y = client_stats['is_churned']

        if y.sum() < 5 or (len(y) - y.sum()) < 5:
            return {"ok": False, "error": "Insufficient class balance for churn prediction"}

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

        model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)

        predictions = model.predict(X_test)
        accuracy = accuracy_score(y_test, predictions)
        precision = precision_score(y_test, predictions, zero_division=0)
        recall = recall_score(y_test, predictions, zero_division=0)
        f1 = f1_score(y_test, predictions, zero_division=0)

        feature_importance = dict(zip(feature_columns, model.feature_importances_.tolist()))

        model_version = f"v{int(pd.Timestamp.now().timestamp())}"
        model_name = f"churn_{tenant_id}_{model_version}.joblib"
        model_path = os.path.join(MODEL_DIR, model_name)
        joblib.dump({"model": model, "features": feature_columns, "stats": client_stats.to_dict()}, model_path)

        metadata = {
            "features": feature_columns,
            "feature_importance": feature_importance,
            "metrics": {
                "accuracy": round(accuracy, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
            },
            "churn_threshold_days": churn_threshold_days,
            "total_clients": len(client_stats),
            "churned_clients": int(y.sum()),
            "model_type": "RandomForestClassifier",
        }

        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO "{schema_name}"."ai_models"
            (id, name, version, type, accuracy, model_path, trained_at, is_current, metadata)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), true, %s)
        """, (
            f"Churn-Prediction-{tenant_id}",
            model_version,
            "CHURN_PREDICTION",
            float(accuracy * 100),
            model_path,
            json.dumps(metadata)
        ))

        cur.execute(f"""
            UPDATE "{schema_name}"."ai_models"
            SET is_current = false
            WHERE type = 'CHURN_PREDICTION' AND version != %s
        """, (model_version,))

        conn.commit()

        return {
            "ok": True,
            "version": model_version,
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "total_clients": len(client_stats),
            "churned_clients": int(y.sum()),
            "model_path": model_path
        }

    except Exception as e:
        logger.error(f"Error training churn model: {e}")
        return {"ok": False, "error": str(e)}
    finally:
        return_db_connection(conn)


def predict_churn(model_path, client_data):
    loaded = joblib.load(model_path)
    model = loaded["model"]
    features = loaded["features"]

    df = pd.DataFrame([client_data])
    X = df[features].fillna(0)

    prediction = model.predict(X)[0]
    probability = model.predict_proba(X)[0]

    return {
        "is_churned": bool(prediction),
        "churn_probability": round(float(probability[1]), 4),
        "retention_probability": round(float(probability[0]), 4),
    }


if __name__ == "__main__":
    result = train_churn_model("demo-tenant", "public")
    logger.info(f"Training result: {result}")
