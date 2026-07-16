import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, sync_solve_routing, haversine_distance

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "ai-service"
        assert "version" in data


class TestHaversineDistance:
    def test_same_point_returns_zero(self):
        dist = haversine_distance(10.0, 106.0, 10.0, 106.0)
        assert dist == 0

    def test_known_distance(self):
        # Ho Chi Minh City to Hanoi approx 1100km
        dist = haversine_distance(10.762622, 106.660172, 21.0278, 105.8342)
        assert 1000000 < dist < 1200000

    def test_symmetry(self):
        d1 = haversine_distance(10.0, 106.0, 21.0, 105.0)
        d2 = haversine_distance(21.0, 105.0, 10.0, 106.0)
        assert abs(d1 - d2) < 0.01


class TestSyncSolveRouting:
    def test_empty_locations_returns_error(self):
        result = sync_solve_routing([], [{"id": "v1", "capacity": 100}], 0)
        assert result["ok"] is False

    def test_empty_vehicles_returns_error(self):
        result = sync_solve_routing([{"id": "l1", "lat": 10.0, "lng": 106.0, "demand": 1}], [], 0)
        assert result["ok"] is False

    def test_single_location_single_vehicle(self):
        locations = [
            {"id": "DEPOT", "lat": 10.762622, "lng": 106.660172, "demand": 0},
            {"id": "LOC1", "lat": 10.77, "lng": 106.67, "demand": 1},
        ]
        vehicles = [{"id": "V1", "capacity": 10}]
        result = sync_solve_routing(locations, vehicles, 0)
        assert result["ok"] is True
        assert "routes" in result

    def test_depot_index_out_of_range_handled(self):
        locations = [
            {"id": "LOC1", "lat": 10.0, "lng": 106.0, "demand": 1},
        ]
        vehicles = [{"id": "V1", "capacity": 10}]
        result = sync_solve_routing(locations, vehicles, 5)
        assert result["ok"] is False
        assert "Depot index 5 out of range" in result.get("error", "")


class TestRoutingEndpoint:
    def test_routing_missing_locations(self):
        response = client.post("/routing/solve", json={
            "locations": [],
            "vehicles": [{"id": "V1", "capacity": 10}],
            "depot_index": 0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False

    def test_routing_missing_vehicles(self):
        response = client.post("/routing/solve", json={
            "locations": [{"id": "L1", "lat": 10.0, "lng": 106.0, "demand": 1}],
            "vehicles": [],
            "depot_index": 0
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False


class TestTrainDemandEndpoint:
    @patch("main.train_demand_model")
    def test_train_starts_background_task(self, mock_train):
        response = client.post("/ai/v1/train/demand", json={
            "tenant_id": "test-tenant",
            "schema_name": "tenant"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        mock_train.assert_called_once()


class TestAnomalyDetectionRequest:
    def test_empty_data_returns_422(self):
        response = client.post("/ai/v1/detect/anomalies", json={"data": []})
        assert response.status_code == 422

    def test_invalid_shipping_fee_returns_422(self):
        response = client.post("/ai/v1/detect/anomalies", json={
            "data": [{"shipping_fee": -1, "cod_amount": 0}]
        })
        assert response.status_code == 422

    def test_invalid_day_of_week_returns_422(self):
        response = client.post("/ai/v1/detect/anomalies", json={
            "data": [{"shipping_fee": 10, "cod_amount": 0, "day_of_week": 7}]
        })
        assert response.status_code == 422


class TestDeliveryTimeRequest:
    def test_invalid_hour_returns_422(self):
        response = client.post("/ai/v1/predict/delivery-time", json={
            "tenant_id": "test", "schema_name": "tenant",
            "day_of_week": 1, "hour": 25
        })
        assert response.status_code == 422

    def test_invalid_day_of_week_returns_422(self):
        response = client.post("/ai/v1/predict/delivery-time", json={
            "tenant_id": "test", "schema_name": "tenant",
            "day_of_week": -1, "hour": 12
        })
        assert response.status_code == 422


class TestChurnPredictionRequest:
    def test_negative_total_orders_returns_422(self):
        response = client.post("/ai/v1/predict/churn", json={
            "tenant_id": "test", "schema_name": "tenant",
            "total_orders": -1, "avg_order_value": 0, "total_cod": 0,
            "days_since_last_order": 0, "customer_lifetime_days": 1,
            "orders_per_month": 0
        })
        assert response.status_code == 422

    def test_zero_customer_lifetime_days_returns_422(self):
        response = client.post("/ai/v1/predict/churn", json={
            "tenant_id": "test", "schema_name": "tenant",
            "total_orders": 0, "avg_order_value": 0, "total_cod": 0,
            "days_since_last_order": 0, "customer_lifetime_days": 0,
            "orders_per_month": 0
        })
        assert response.status_code == 422


class TestFeedbackEndpoint:
    @patch("main.retrain_with_feedback")
    @patch("main.get_db_connection")
    def test_save_feedback_success(self, mock_db, mock_retrain):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_db.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        response = client.post("/ai/v1/feedback", json={
            "tenant_id": "test-tenant",
            "schema_name": "tenant",
            "model_id": "model-1",
            "resource_type": "ORDER",
            "resource_id": "order-1",
            "ai_prediction": {"day_of_week": 1, "hour": 10, "item_count": 5},
            "human_corrected": {"total_weight_kg": 12.5},
            "confidence": 0.85
        })
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

    def test_save_feedback_invalid_confidence(self):
        response = client.post("/ai/v1/feedback", json={
            "model_id": "model-1",
            "resource_type": "ORDER",
            "resource_id": "order-1",
            "ai_prediction": {"test": True},
            "human_corrected": {"test": False},
            "confidence": 1.5
        })
        assert response.status_code == 422 or response.status_code == 400
