import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score

logger = logging.getLogger("ai-service.pretrain")

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)


def generate_demand_data(n_samples=2000):
    np.random.seed(42)
    data = {
        "day_of_week": np.random.randint(0, 7, n_samples),
        "hour": np.random.randint(6, 22, n_samples),
        "item_count": np.random.randint(1, 50, n_samples),
        "month": np.random.randint(1, 13, n_samples),
        "is_weekend": np.zeros(n_samples),
        "is_morning": np.zeros(n_samples),
        "is_afternoon": np.zeros(n_samples),
        "is_evening": np.zeros(n_samples),
    }
    df = pd.DataFrame(data)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_morning"] = (df["hour"] < 12).astype(int)
    df["is_afternoon"] = ((df["hour"] >= 12) & (df["hour"] < 17)).astype(int)
    df["is_evening"] = (df["hour"] >= 17).astype(int)

    base_weight = 5.0
    df["total_weight_kg"] = (
        base_weight
        + df["item_count"] * 0.5
        + df["is_weekend"] * 3.0
        + df["is_morning"] * -1.0
        + np.random.normal(0, 2, n_samples)
    )
    df["total_weight_kg"] = df["total_weight_kg"].clip(lower=0.5)
    return df


def generate_delivery_data(n_samples=1500):
    np.random.seed(42)
    df = pd.DataFrame({
        "created_at": pd.date_range(start="2024-01-01", periods=n_samples, freq="h"),
    })
    df["day_of_week"] = df["created_at"].dt.dayofweek
    df["hour"] = df["created_at"].dt.hour
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    base_duration = 30.0
    df["delivery_duration_minutes"] = (
        base_duration
        + df["day_of_week"] * 2.0
        + df["hour"] * 0.5
        + df["is_weekend"] * 10.0
        + np.random.normal(0, 5, n_samples)
    )
    df["delivery_duration_minutes"] = df["delivery_duration_minutes"].clip(lower=5)
    return df


def generate_anomaly_data(n_samples=500):
    np.random.seed(42)
    df = pd.DataFrame({
        "shipping_fee": np.random.uniform(1, 100, n_samples),
        "cod_amount": np.random.uniform(0, 500, n_samples),
        "day_of_week": np.random.randint(0, 7, n_samples),
        "hour": np.random.randint(0, 24, n_samples),
    })

    outlier_indices = np.random.choice(n_samples, size=int(n_samples * 0.05), replace=False)
    df.loc[outlier_indices, "shipping_fee"] = np.random.uniform(500, 2000, len(outlier_indices))
    df.loc[outlier_indices, "cod_amount"] = np.random.uniform(2000, 10000, len(outlier_indices))
    return df


def generate_churn_data(n_clients=200):
    np.random.seed(42)
    np.random.seed(42)
    n = n_clients
    df = pd.DataFrame({
        "client_id": [f"client_{i}" for i in range(n)],
        "total_orders": np.random.poisson(20, n).clip(1),
        "avg_order_value": np.random.uniform(5, 200, n),
        "total_cod": np.random.uniform(0, 5000, n),
        "days_since_last_order": np.random.exponential(60, n).astype(int).clip(0),
        "customer_lifetime_days": np.random.exponential(365, n).astype(int).clip(1),
        "orders_per_month": np.random.uniform(0.5, 30, n),
    })
    df["is_churned"] = (df["days_since_last_order"] > 90).astype(int)
    churned = df["is_churned"].sum()
    if churned < 10:
        force_churn = np.random.choice(df.index, size=10, replace=False)
        df.loc[force_churn, "days_since_last_order"] = np.random.randint(91, 365, 10)
        df.loc[force_churn, "is_churned"] = 1
    not_churned = len(df) - df["is_churned"].sum()
    if not_churned < 10:
        force_not = np.random.choice(df[df["is_churned"] == 1].index, size=5, replace=False)
        df.loc[force_not, "days_since_last_order"] = np.random.randint(1, 30, 5)
        df.loc[force_not, "is_churned"] = 0
    return df


def pretrain_demand():
    logger.info("Pre-training Demand Forecast model...")
    df = generate_demand_data()
    feature_columns = ["day_of_week", "hour", "item_count", "month", "is_weekend", "is_morning", "is_afternoon", "is_evening"]
    X = df[feature_columns]
    y = df["total_weight_kg"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    accuracy = max(0, 100 - (mae / (y.mean() + 1) * 100))

    model_path = os.path.join(MODEL_DIR, "production_demand_v1.joblib")
    joblib.dump(model, model_path)

    metadata = {
        "features": feature_columns,
        "feature_importance": dict(zip(feature_columns, model.feature_importances_.tolist())),
        "metrics": {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4), "accuracy": round(accuracy, 2)},
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_type": "RandomForestRegressor",
    }
    logger.info(f"  Demand model saved: {model_path}")
    logger.info(f"  Accuracy: {accuracy:.2f}%")
    return metadata


def pretrain_delivery_time():
    logger.info("Pre-training Delivery Time model...")
    df = generate_delivery_data()
    feature_columns = ["day_of_week", "hour", "is_weekend"]
    X = df[feature_columns]
    X["is_weekend"] = X["is_weekend"].astype(int)
    y = df["delivery_duration_minutes"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    from sklearn.ensemble import GradientBoostingRegressor
    model = GradientBoostingRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)

    model_path = os.path.join(MODEL_DIR, "production_delivery_time_v1.joblib")
    joblib.dump(model, model_path)

    metadata = {
        "features": feature_columns,
        "metrics": {"mae": round(mae, 4), "rmse": round(rmse, 4), "r2": round(r2, 4)},
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_type": "GradientBoostingRegressor",
    }
    logger.info(f"  Delivery time model saved: {model_path}")
    logger.info(f"  MAE: {mae:.2f} min")
    return metadata


def pretrain_anomaly():
    logger.info("Pre-training Anomaly Detection model...")
    df = generate_anomaly_data()
    feature_columns = ["shipping_fee", "cod_amount", "day_of_week", "hour"]
    X = df[feature_columns].fillna(0)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1)
    model.fit(X_scaled)

    predictions = model.predict(X_scaled)
    n_anomalies = (predictions == -1).sum()

    model_path = os.path.join(MODEL_DIR, "production_anomaly_v1.joblib")
    joblib.dump({"model": model, "scaler": scaler, "features": feature_columns}, model_path)

    metadata = {
        "features": feature_columns,
        "n_anomalies_detected": int(n_anomalies),
        "total_samples": len(df),
        "anomaly_rate": round(n_anomalies / len(df) * 100, 2),
        "model_type": "IsolationForest",
    }
    logger.info(f"  Anomaly model saved: {model_path}")
    logger.info(f"  Anomaly rate: {metadata['anomaly_rate']:.2f}%")
    return metadata


def pretrain_churn():
    logger.info("Pre-training Churn Prediction model...")
    df = generate_churn_data()
    feature_columns = ["total_orders", "avg_order_value", "total_cod", "days_since_last_order", "customer_lifetime_days", "orders_per_month"]
    X = df[feature_columns].fillna(0)
    y = df["is_churned"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)

    model_path = os.path.join(MODEL_DIR, "production_churn_v1.joblib")
    joblib.dump({"model": model, "features": feature_columns}, model_path)

    metadata = {
        "features": feature_columns,
        "feature_importance": dict(zip(feature_columns, model.feature_importances_.tolist())),
        "metrics": {"accuracy": round(accuracy, 4)},
        "total_clients": len(df),
        "churned_clients": int(y.sum()),
        "model_type": "RandomForestClassifier",
    }
    logger.info(f"  Churn model saved: {model_path}")
    logger.info(f"  Accuracy: {accuracy:.2%}")
    return metadata


def update_prediction_logic():
    logger.info("Updating prediction logic to use production models...")

    demand_model_path = os.path.join(MODEL_DIR, "production_demand_v1.joblib")
    delivery_model_path = os.path.join(MODEL_DIR, "production_delivery_time_v1.joblib")
    anomaly_model_path = os.path.join(MODEL_DIR, "production_anomaly_v1.joblib")
    churn_model_path = os.path.join(MODEL_DIR, "production_churn_v1.joblib")

    models_status = {
        "demand": os.path.exists(demand_model_path),
        "delivery_time": os.path.exists(delivery_model_path),
        "anomaly": os.path.exists(anomaly_model_path),
        "churn": os.path.exists(churn_model_path),
    }

    for name, exists in models_status.items():
        status = "READY" if exists else "NOT FOUND"
        logger.info(f"  {name}: {status}")

    return models_status


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("Pre-training all AI models with synthetic data")
    logger.info("=" * 50)

    demand_meta = pretrain_demand()
    delivery_meta = pretrain_delivery_time()
    anomaly_meta = pretrain_anomaly()
    churn_meta = pretrain_churn()

    models_status = update_prediction_logic()

    total = sum(1 for v in models_status.values() if v)
    logger.info(f"Pre-training complete: {total}/4 models ready")
    logger.info(f"Models directory: {os.path.abspath(MODEL_DIR)}")
    logger.info("Next steps:")
    logger.info("  1. Deploy AI service - models will be loaded automatically")
    logger.info("  2. Retrain with real data via POST /ai/v1/train/* endpoints")
    logger.info("  3. Monitor model accuracy via POST /ai/v1/feedback")
