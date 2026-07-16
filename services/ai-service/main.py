import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import FastAPI, BackgroundTasks, Header, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import math
import os
import json
import asyncio
import concurrent.futures
import joblib
import glob
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from train_demand import train_demand_model
from feedback_loop import retrain_with_feedback
from delivery_time import train_delivery_time_model, predict_delivery_time
from anomaly_detection import train_anomaly_model, detect_anomalies
from churn_prediction import train_churn_model, predict_churn
from data_loader import validate_schema_name, get_db_connection, return_db_connection, close_db_pool

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ai-service")

AI_API_KEY = os.getenv("AI_API_KEY") or "smartlogi-ai-secret-key"
if not AI_API_KEY or AI_API_KEY == "":
    logger.warning("AI_API_KEY not set, using default key for development")
    AI_API_KEY = "smartlogi-ai-secret-key"

class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > cutoff]
        if len(self.requests[client_ip]) >= self.max_requests:
            return False
        self.requests[client_ip].append(now)
        return True

rate_limiter = RateLimiter()

async def verify_api_key(authorization: Optional[str] = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing API key")
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    if token != AI_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"ok": False, "detail": "Too many requests"})
    response = await call_next(request)
    return response

cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:4001,http://localhost:4002,http://localhost:4003,http://localhost:4004")
cors_origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[FastApiIntegration()],
    traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
    environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
    send_default_pii=False,
)

app = FastAPI(title="SmartLogi AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

app.middleware("http")(rate_limit_middleware)


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down AI service, closing database pool...")
    close_db_pool()


class TrainingRequest(BaseModel):
    tenant_id: str
    schema_name: str

    @validator('schema_name')
    def validate_schema_name(cls, v):
        if not validate_schema_name(v):
            raise ValueError('Invalid schema name')
        return v


class PredictionRequest(BaseModel):
    tenant_id: str
    schema_name: str
    day_of_week: int
    hour: int
    item_count: int

    @validator('day_of_week')
    def validate_day(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('day_of_week must be between 0 and 6')
        return v

    @validator('hour')
    def validate_hour(cls, v):
        if not 0 <= v <= 23:
            raise ValueError('hour must be between 0 and 23')
        return v


class DeliveryTimeRequest(BaseModel):
    tenant_id: str
    schema_name: str
    day_of_week: int
    hour: int
    is_weekend: bool = False

    @validator('day_of_week')
    def validate_day(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('day_of_week must be between 0 and 6')
        return v

    @validator('hour')
    def validate_hour(cls, v):
        if not 0 <= v <= 23:
            raise ValueError('hour must be between 0 and 23')
        return v


class ChurnPredictionRequest(BaseModel):
    tenant_id: str
    schema_name: str
    total_orders: int
    avg_order_value: float
    total_cod: float
    days_since_last_order: int
    customer_lifetime_days: int
    orders_per_month: float

    @validator('total_orders')
    def validate_total_orders(cls, v):
        if v < 0:
            raise ValueError('total_orders must be non-negative')
        return v

    @validator('avg_order_value')
    def validate_avg_order_value(cls, v):
        if v < 0:
            raise ValueError('avg_order_value must be non-negative')
        return v

    @validator('total_cod')
    def validate_total_cod(cls, v):
        if v < 0:
            raise ValueError('total_cod must be non-negative')
        return v

    @validator('days_since_last_order')
    def validate_days_since_last_order(cls, v):
        if v < 0:
            raise ValueError('days_since_last_order must be non-negative')
        return v

    @validator('customer_lifetime_days')
    def validate_customer_lifetime_days(cls, v):
        if v < 1:
            raise ValueError('customer_lifetime_days must be at least 1')
        return v

    @validator('orders_per_month')
    def validate_orders_per_month(cls, v):
        if v < 0:
            raise ValueError('orders_per_month must be non-negative')
        return v


class FeedbackRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    tenant_id: str
    schema_name: str
    model_id: str
    resource_type: str
    resource_id: str
    ai_prediction: Dict[str, Any]
    human_corrected: Dict[str, Any]
    confidence: float

    @validator('schema_name')
    def validate_schema_name(cls, v):
        if not validate_schema_name(v):
            raise ValueError('Invalid schema name')
        return v

    @validator('confidence')
    def validate_confidence(cls, v):
        if not 0 <= v <= 1:
            raise ValueError('Confidence must be between 0 and 1')
        return v


class AnomalyDataItem(BaseModel):
    shipping_fee: float
    cod_amount: float
    day_of_week: int = 0
    hour: int = 0

    @validator('shipping_fee')
    def validate_shipping_fee(cls, v):
        if v < 0:
            raise ValueError('shipping_fee must be non-negative')
        return v

    @validator('cod_amount')
    def validate_cod_amount(cls, v):
        if v < 0:
            raise ValueError('cod_amount must be non-negative')
        return v

    @validator('day_of_week')
    def validate_day(cls, v):
        if not 0 <= v <= 6:
            raise ValueError('day_of_week must be between 0 and 6')
        return v

    @validator('hour')
    def validate_hour(cls, v):
        if not 0 <= v <= 23:
            raise ValueError('hour must be between 0 and 23')
        return v


class AnomalyDetectionRequest(BaseModel):
    data: List[AnomalyDataItem]

    @validator('data')
    def validate_data_not_empty(cls, v):
        if not v:
            raise ValueError('data must not be empty')
        return v


class Location(BaseModel):
    id: str
    lat: float
    lng: float
    demand: int = 0


class Vehicle(BaseModel):
    id: str
    capacity: int


class RoutingRequest(BaseModel):
    locations: List[Location]
    vehicles: List[Vehicle]
    depot_index: int = 0

    @validator('depot_index')
    def validate_depot_index(cls, v, values):
        locs = values.get('locations')
        if locs and v >= len(locs):
            raise ValueError('depot_index must be less than number of locations')
        return v


@app.get("/health")
async def health():
    db_status = "unknown"
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Health check DB error: {e}")
    finally:
        if conn:
            return_db_connection(conn)

    model_dir = os.getenv("AI_MODEL_DIR", "models")
    model_files = glob.glob(os.path.join(model_dir, "*.joblib"))
    models_loaded = len(model_files)

    model_details = []
    for fpath in model_files:
        fname = os.path.basename(fpath)
        fsize = os.path.getsize(fpath)
        mtime = datetime.fromtimestamp(os.path.getmtime(fpath)).isoformat()
        model_type = "unknown"
        if "demand" in fname:
            model_type = "demand"
        elif "delivery_time" in fname:
            model_type = "delivery_time"
        elif "churn" in fname:
            model_type = "churn"
        elif "anomaly" in fname:
            model_type = "anomaly"
        model_details.append({
            "file": fname,
            "size_bytes": fsize,
            "modified_at": mtime,
            "type": model_type,
        })

    status = "ok" if db_status == "connected" and models_loaded > 0 else "degraded"

    return {
        "status": status,
        "service": "ai-service",
        "version": "2.0.0",
        "database": db_status,
        "models_loaded": models_loaded,
        "models": model_details,
        "sentry_enabled": sentry_sdk.Hub.current.client is not None if sentry_sdk.Hub.current else False,
    }


@app.get("/ai/v1/models")
async def list_models(
    type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    auth: None = Depends(verify_api_key),
):
    if page < 1:
        page = 1
    if limit < 1:
        limit = 20
    if limit > 100:
        limit = 100

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            count_query = 'SELECT COUNT(*) FROM "tenant"."ai_models"'
            count_params = []
            if type:
                count_query += " WHERE type = %s"
                count_params.append(type)
            cur.execute(count_query, count_params)
            total = cur.fetchone()[0]

            offset = (page - 1) * limit
            query = 'SELECT id, name, version, type, accuracy, is_current, trained_at, metadata FROM "tenant"."ai_models"'
            if type:
                query += " WHERE type = %s"
                query += " ORDER BY trained_at DESC LIMIT %s OFFSET %s"
                cur.execute(query, (type, limit, offset))
            else:
                query += " ORDER BY trained_at DESC LIMIT %s OFFSET %s"
                cur.execute(query, (limit, offset))

            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
            return {
                "data": rows,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": max(1, -(-total // limit)),
                },
            }
    finally:
        return_db_connection(conn)


@app.get("/ai/v1/feedbacks")
async def list_feedbacks(
    model_id: Optional[str] = None,
    is_used: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    auth: None = Depends(verify_api_key),
):
    if page < 1:
        page = 1
    if limit < 1:
        limit = 20
    if limit > 100:
        limit = 100

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            count_query = 'SELECT COUNT(*) FROM "tenant"."ai_feedbacks"'
            count_conditions = []
            count_params = []
            if model_id:
                count_conditions.append("model_id = %s")
                count_params.append(model_id)
            if is_used is not None:
                count_conditions.append("is_used_for_train = %s")
                count_params.append(is_used)
            if count_conditions:
                count_query += " WHERE " + " AND ".join(count_conditions)
            cur.execute(count_query, count_params)
            total = cur.fetchone()[0]

            offset = (page - 1) * limit
            query = 'SELECT id, model_id, resource_type, resource_id, ai_prediction, human_corrected, confidence, is_used_for_train, created_at FROM "tenant"."ai_feedbacks"'
            conditions = []
            params = []
            if model_id:
                conditions.append("model_id = %s")
                params.append(model_id)
            if is_used is not None:
                conditions.append("is_used_for_train = %s")
                params.append(is_used)
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            cur.execute(query, params)
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
            return {
                "data": rows,
                "meta": {
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "total_pages": max(1, -(-total // limit)),
                },
            }
    finally:
        return_db_connection(conn)


@app.delete("/ai/v1/models/{model_id}")
async def delete_model(model_id: str, auth: None = Depends(verify_api_key)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT model_path FROM "tenant"."ai_models" WHERE id = %s', (model_id,))
            model = cur.fetchone()
            if not model:
                raise HTTPException(status_code=404, detail="Model not found")

            file_path = model[0]
            cur.execute('DELETE FROM "tenant"."ai_models" WHERE id = %s', (model_id,))
            conn.commit()

            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"Deleted model file: {file_path}")
                except OSError as e:
                    logger.warning(f"Could not delete model file {file_path}: {e}")

            return {"ok": True, "message": f"Model {model_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting model {model_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")
    finally:
        return_db_connection(conn)


@app.delete("/ai/v1/feedbacks/{feedback_id}")
async def delete_feedback(feedback_id: str, auth: None = Depends(verify_api_key)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM "tenant"."ai_feedbacks" WHERE id = %s', (feedback_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Feedback not found")
            cur.execute('DELETE FROM "tenant"."ai_feedbacks" WHERE id = %s', (feedback_id,))
            conn.commit()
            return {"ok": True, "message": f"Feedback {feedback_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback {feedback_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting feedback: {str(e)}")
    finally:
        return_db_connection(conn)


def find_latest_model(patterns):
    model_dir = os.getenv("AI_MODEL_DIR", "models")
    for pattern in patterns:
        files = sorted(glob.glob(os.path.join(model_dir, pattern)))
        if files:
            return files[-1]
    return None


@app.post("/ai/v1/predict/demand")
async def predict_demand(payload: PredictionRequest, auth: None = Depends(verify_api_key)):
    latest_model_path = find_latest_model(["production_demand_*.joblib", "demand_model_*.joblib"])
    if not latest_model_path:
        raise HTTPException(status_code=404, detail="No trained model found. Please train a model first.")

    model = joblib.load(latest_model_path)

    features = [[payload.day_of_week, payload.hour, payload.item_count]]
    prediction = model.predict(features)

    return {
        "ok": True,
        "predicted_weight_kg": round(float(prediction[0]), 2),
        "model_path": latest_model_path,
        "features": {
            "day_of_week": payload.day_of_week,
            "hour": payload.hour,
            "item_count": payload.item_count,
        },
    }


@app.post("/ai/v1/train/demand")
async def train_demand(payload: TrainingRequest, background_tasks: BackgroundTasks, auth: None = Depends(verify_api_key)):
    background_tasks.add_task(train_demand_model, payload.tenant_id, payload.schema_name)
    return {"ok": True, "message": "Training job started"}


@app.post("/ai/v1/predict/delivery-time")
async def predict_delivery_time_endpoint(payload: DeliveryTimeRequest, auth: None = Depends(verify_api_key)):
    latest_model_path = find_latest_model(["production_delivery_time_*.joblib", "delivery_time_*.joblib"])
    if not latest_model_path:
        raise HTTPException(status_code=404, detail="No delivery time model found. Please train a model first.")

    is_weekend = 1 if payload.is_weekend else 0
    prediction = predict_delivery_time(latest_model_path, payload.day_of_week, payload.hour, is_weekend)

    return {
        "ok": True,
        "predicted_duration_minutes": prediction,
        "model_path": latest_model_path,
    }


@app.post("/ai/v1/train/delivery-time")
async def train_delivery_time_endpoint(payload: TrainingRequest, background_tasks: BackgroundTasks, auth: None = Depends(verify_api_key)):
    background_tasks.add_task(train_delivery_time_model, payload.tenant_id, payload.schema_name)
    return {"ok": True, "message": "Delivery time training job started"}


@app.post("/ai/v1/predict/churn")
async def predict_churn_endpoint(payload: ChurnPredictionRequest, auth: None = Depends(verify_api_key)):
    latest_model_path = find_latest_model(["production_churn_*.joblib", "churn_*.joblib"])
    if not latest_model_path:
        raise HTTPException(status_code=404, detail="No churn model found. Please train a model first.")

    client_data = {
        "total_orders": payload.total_orders,
        "avg_order_value": payload.avg_order_value,
        "total_cod": payload.total_cod,
        "days_since_last_order": payload.days_since_last_order,
        "customer_lifetime_days": payload.customer_lifetime_days,
        "orders_per_month": payload.orders_per_month,
    }
    result = predict_churn(latest_model_path, client_data)

    return {
        "ok": True,
        **result,
    }


@app.post("/ai/v1/train/churn")
async def train_churn_endpoint(payload: TrainingRequest, background_tasks: BackgroundTasks, auth: None = Depends(verify_api_key)):
    background_tasks.add_task(train_churn_model, payload.tenant_id, payload.schema_name)
    return {"ok": True, "message": "Churn prediction training job started"}


@app.post("/ai/v1/detect/anomalies")
async def detect_anomalies_endpoint(payload: AnomalyDetectionRequest, auth: None = Depends(verify_api_key)):
    latest_model_path = find_latest_model(["production_anomaly_*.joblib", "anomaly_*.joblib"])
    if not latest_model_path:
        raise HTTPException(status_code=404, detail="No anomaly model found. Please train a model first.")

    data = [item.dict() for item in payload.data]
    results = detect_anomalies(latest_model_path, data)
    n_anomalies = sum(1 for r in results if r["is_anomaly"])

    return {
        "ok": True,
        "total_analyzed": len(results),
        "anomalies_detected": n_anomalies,
        "results": results,
    }


@app.post("/ai/v1/train/anomaly")
async def train_anomaly_endpoint(payload: TrainingRequest, background_tasks: BackgroundTasks, auth: None = Depends(verify_api_key)):
    background_tasks.add_task(train_anomaly_model, payload.tenant_id, payload.schema_name)
    return {"ok": True, "message": "Anomaly detection training job started"}


@app.post("/ai/v1/feedback")
async def save_feedback(payload: FeedbackRequest, background_tasks: BackgroundTasks, auth: None = Depends(verify_api_key)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO "tenant"."ai_feedbacks"
                (id, model_id, resource_type, resource_id, ai_prediction, human_corrected, confidence, created_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, NOW())
            """, (
                payload.model_id,
                payload.resource_type,
                payload.resource_id,
                json.dumps(payload.ai_prediction),
                json.dumps(payload.human_corrected),
                payload.confidence
            ))
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving feedback: {str(e)}")
    finally:
        return_db_connection(conn)

    background_tasks.add_task(retrain_with_feedback, payload.tenant_id, payload.schema_name)
    return {"ok": True, "message": "Feedback recorded. AI Core is evolving."}


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def sync_solve_routing(locations, vehicles, depot_index):
    if not locations or not vehicles:
        return {"ok": False, "error": "Missing locations or vehicles"}
    if depot_index < 0 or depot_index >= len(locations):
        return {"ok": False, "error": f"Depot index {depot_index} out of range (0-{len(locations)-1})"}

    def compute_distance(p1, p2):
        dist = haversine_distance(p1['lat'], p1['lng'], p2['lat'], p2['lng'])
        return int(dist * 1.41)

    distance_matrix = [[compute_distance(l1, l2) for l2 in locations] for l1 in locations]
    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), len(vehicles), depot_index)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        return distance_matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        return int(locations[manager.IndexToNode(from_index)].get('demand', 0))

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index, 0, [v['capacity'] for v in vehicles], True, 'Capacity'
    )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        routes = []
        total_distance = 0
        for v_idx in range(len(vehicles)):
            index = routing.Start(v_idx)
            route = []
            route_distance = 0
            while not routing.IsEnd(index):
                node_idx = manager.IndexToNode(index)
                route.append({"id": locations[node_idx]["id"], "lat": locations[node_idx]["lat"], "lng": locations[node_idx]["lng"]})
                next_index = solution.Value(routing.NextVar(index))
                route_distance += distance_matrix[manager.IndexToNode(index)][manager.IndexToNode(next_index)]
                index = next_index
            route.append({"id": locations[manager.IndexToNode(index)]["id"], "lat": locations[manager.IndexToNode(index)]["lat"], "lng": locations[manager.IndexToNode(index)]["lng"]})
            if len(route) > 2:
                routes.append({
                    "vehicle_id": vehicles[v_idx]["id"],
                    "route": route,
                    "distance_meters": route_distance,
                    "stops": len(route) - 2,
                })
                total_distance += route_distance
        return {"ok": True, "routes": routes, "total_distance_meters": total_distance, "total_vehicles": len(routes)}
    return {"ok": False, "error": "No solution found"}


@app.patch("/ai/v1/models/{model_id}/activate")
async def activate_model(model_id: str, auth: None = Depends(verify_api_key)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE "tenant"."ai_models"
                SET is_current = (id = %s)
                WHERE type = (SELECT type FROM "tenant"."ai_models" WHERE id = %s)
            """, (model_id, model_id))
            conn.commit()
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Model not found")
            return {"ok": True, "message": f"Model {model_id} activated"}
    finally:
        return_db_connection(conn)


@app.post("/routing/solve")
async def solve_routing(payload: RoutingRequest, auth: None = Depends(verify_api_key)):
    locations = [{"id": loc.id, "lat": loc.lat, "lng": loc.lng, "demand": loc.demand} for loc in payload.locations]
    vehicles = [{"id": veh.id, "capacity": veh.capacity} for veh in payload.vehicles]

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, sync_solve_routing, locations, vehicles, payload.depot_index)
    return result
