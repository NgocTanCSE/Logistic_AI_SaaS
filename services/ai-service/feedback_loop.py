import os
import json
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from data_loader import get_db_connection, return_db_connection, validate_schema_name

logger = logging.getLogger("ai-service.feedback_loop")

MODEL_DIR = os.getenv("AI_MODEL_DIR", "models")


def retrain_with_feedback(tenant_id, schema_name="tenant"):
    if not validate_schema_name(schema_name):
        return {"ok": False, "error": "Invalid schema name"}

    logger.info(f"Activating feedback loop for tenant: {tenant_id}")

    conn = get_db_connection()
    try:
        feedback_query = f'SELECT ai_prediction, human_corrected, confidence FROM "{schema_name}"."ai_feedbacks" WHERE is_used_for_train = false'
        feedback_df = pd.read_sql(feedback_query, conn)

        if feedback_df.empty:
            logger.info("No new feedback to learn from. Keeping current model.")
            return {"ok": True, "message": "No new feedback"}

        logger.info(f"Found {len(feedback_df)} new feedback items for learning.")

        new_X = []
        new_y = []
        weights = []

        for _, row in feedback_df.iterrows():
            pred = row['ai_prediction']
            corrected = row['human_corrected']
            confidence = row.get('confidence', 0.5)

            if pred and corrected:
                features = [
                    pred.get('day_of_week', 0),
                    pred.get('hour', 12),
                    pred.get('item_count', 1),
                ]
                target = corrected.get('total_weight_kg', corrected.get('predicted_weight_kg', 0))

                if all(f is not None for f in features) and target is not None:
                    new_X.append(features)
                    new_y.append(target)
                    weights.append(float(confidence) if confidence else 0.5)

        if not new_X or not new_y:
            return {"ok": False, "error": "No valid feedback data to train on"}

        model_files = sorted([f for f in os.listdir(MODEL_DIR) if f.startswith("demand_model_")])
        if not model_files:
            return {"ok": False, "error": "No base model found to evolve"}

        model_path = os.path.join(MODEL_DIR, model_files[-1])
        current_model = joblib.load(model_path)

        X_train = pd.DataFrame(new_X, columns=['day_of_week', 'hour', 'item_count'])
        y_train = pd.Series(new_y)
        sample_weights = np.array(weights)

        current_model.fit(X_train, y_train, sample_weight=sample_weights)

        predictions = current_model.predict(X_train)
        mae = mean_absolute_error(y_train, predictions)
        accuracy = 100 - (mae / (y_train.mean() + 1) * 100)

        model_version = f"v_evolved_{int(pd.Timestamp.now().timestamp())}"
        new_model_name = f"evolved_{tenant_id}_{model_version}.joblib"
        new_model_path = os.path.join(MODEL_DIR, new_model_name)
        joblib.dump(current_model, new_model_path)

        cur = conn.cursor()
        cur.execute(f'UPDATE "{schema_name}"."ai_feedbacks" SET is_used_for_train = true WHERE is_used_for_train = false')

        cur.execute(f"""
            INSERT INTO "{schema_name}"."ai_models"
            (id, name, version, type, accuracy, model_path, trained_at, is_current, metadata)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW(), true, %s)
        """, (
            f"Evolved-Demand-{tenant_id}",
            model_version,
            "FORECASTING",
            float(accuracy),
            new_model_path,
            json.dumps({
                "feedback_items": len(feedback_df),
                "accuracy": round(accuracy, 2),
                "mae": round(mae, 4),
            })
        ))

        cur.execute(f"""
            UPDATE "{schema_name}"."ai_models"
            SET is_current = false
            WHERE type = 'FORECASTING' AND version != %s
        """, (model_version,))

        conn.commit()

        logger.info(f"Feedback loop completed. Model evolved with accuracy: {accuracy:.2f}%")
        return {"ok": True, "learned_items": len(feedback_df), "accuracy": round(accuracy, 2)}

    except Exception as e:
        logger.error(f"Feedback Loop Error: {e}")
        return {"ok": False, "error": str(e)}
    finally:
        return_db_connection(conn)


if __name__ == "__main__":
    retrain_with_feedback("demo-tenant")
