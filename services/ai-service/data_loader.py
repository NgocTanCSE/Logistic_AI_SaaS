import os
import re
import logging
import pandas as pd
import numpy as np
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("ai-service.data_loader")

_db_pool = None

def get_db_pool():
    global _db_pool
    if _db_pool is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL environment variable is required")
        min_conn = int(os.getenv("DB_POOL_MIN", "2"))
        max_conn = int(os.getenv("DB_POOL_MAX", "10"))
        try:
            _db_pool = pool.ThreadedConnectionPool(min_conn, max_conn, db_url)
            logger.info(f"Database connection pool created (min={min_conn}, max={max_conn})")
        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            raise
    return _db_pool

def get_db_connection():
    pool = get_db_pool()
    try:
        conn = pool.getconn()
        if conn is None:
            raise RuntimeError("Failed to get connection from pool")
        return conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        raise

def return_db_connection(conn):
    global _db_pool
    if _db_pool and conn:
        try:
            _db_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error returning connection to pool: {e}")

def close_db_pool():
    global _db_pool
    if _db_pool:
        try:
            _db_pool.closeall()
            logger.info("Database connection pool closed")
        except Exception as e:
            logger.error(f"Error closing connection pool: {e}")
        finally:
            _db_pool = None

def validate_schema_name(schema_name: str) -> bool:
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', schema_name))

def load_order_history(schema_name="tenant"):
    if not validate_schema_name(schema_name):
        raise ValueError(f"Invalid schema name: {schema_name}")

    query = f"""
    SELECT
        o.id,
        o.status,
        o.created_at,
        o.shipping_fee,
        o.cod_amount,
        o.recipient_address,
        COALESCE(SUM(oi.quantity), 0) AS item_count,
        COALESCE(SUM(p.weight_kg * oi.quantity), 0) AS total_weight_kg
    FROM "{schema_name}"."orders" o
    LEFT JOIN "{schema_name}"."order_items" oi ON o.id = oi.order_id
    LEFT JOIN "{schema_name}"."products" p ON oi.product_id = p.id
    WHERE o.status != 'CANCELLED'
    GROUP BY o.id
    """

    conn = get_db_connection()
    try:
        df = pd.read_sql(query, conn)

        if df.empty:
            return df

        if 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'])
            df['day_of_week'] = df['created_at'].dt.dayofweek
            df['hour'] = df['created_at'].dt.hour
            df['month'] = df['created_at'].dt.month
            df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
            df['is_morning'] = ((df['hour'] >= 6) & (df['hour'] < 12)).astype(int)
            df['is_afternoon'] = ((df['hour'] >= 12) & (df['hour'] < 18)).astype(int)
            df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] < 24)).astype(int)
        else:
            df['day_of_week'] = df.index % 7
            df['hour'] = df.index % 24
            df['month'] = 1
            df['is_weekend'] = 0
            df['is_morning'] = 0
            df['is_afternoon'] = 0
            df['is_evening'] = 0

        return df
    except Exception as e:
        logger.error(f"Error in schema {schema_name}: {e}")
        return pd.DataFrame()
    finally:
        return_db_connection(conn)


def load_delivery_history(schema_name="tenant"):
    if not validate_schema_name(schema_name):
        raise ValueError(f"Invalid schema name: {schema_name}")

    query = f"""
    SELECT
        d.id,
        d.trip_id,
        d.order_id,
        d.status,
        d.created_at,
        d.updated_at,
        o.recipient_address,
        o.shipping_fee
    FROM "{schema_name}"."deliveries" d
    JOIN "{schema_name}"."orders" o ON d.order_id = o.id
    WHERE d.status = 'DELIVERED'
    """

    conn = get_db_connection()
    try:
        df = pd.read_sql(query, conn)
        if not df.empty and 'created_at' in df.columns:
            df['created_at'] = pd.to_datetime(df['created_at'])
            df['updated_at'] = pd.to_datetime(df['updated_at'])
            df['delivery_duration_minutes'] = (df['updated_at'] - df['created_at']).dt.total_seconds() / 60
        return df
    except Exception as e:
        logger.error(f"Error loading delivery history: {e}")
        return pd.DataFrame()
    finally:
        return_db_connection(conn)


if __name__ == "__main__":
    data = load_order_history()
    logger.info(f"Loaded {len(data)} rows")
    if not data.empty:
        logger.info(f"Columns: {data.columns.tolist()}")
        logger.info(f"\n{data.head()}")
