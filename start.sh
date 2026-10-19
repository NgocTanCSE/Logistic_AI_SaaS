#!/bin/bash
echo "Starting Logistics AI SaaS..."

cd /app

echo "Loading environment variables..."
if [ -z "$JWT_SECRET" ]; then
  echo "Using default environment variables (JWT_SECRET not set externally)"
  export JWT_SECRET="smartlogi-jwt-secret"
fi
# Vercel sets $PORT; default to 3007 for local/other environments
if [ -z "$PORT" ]; then
  export PORT=3007
fi
echo "API Gateway listening on PORT=$PORT"

DB_PATH="/app/packages/prisma-schemas/prisma/dev.db"
SCHEMA_DIR="/app/packages/prisma-schemas"

echo "Checking database schema..."
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found, creating..."
  cd "$SCHEMA_DIR"
  DATABASE_URL="file:$DB_PATH" npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate
  cd /app
fi
if [ -f "$DB_PATH" ]; then
  echo "Database exists, running seed..."
  DATABASE_URL="file:$DB_PATH" FORCE_RESEED=true npx ts-node packages/prisma-schemas/prisma/seeds/index.ts
fi

sleep 2

echo "Starting services via Supervisor..."
exec /usr/bin/supervisord -n -c /app/supervisord.conf