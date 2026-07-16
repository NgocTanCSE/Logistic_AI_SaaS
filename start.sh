#!/bin/bash
echo "Starting Logistics AI SaaS..."

cd /app

echo "Loading environment variables..."
if [ -z "$JWT_SECRET" ]; then
  echo "Using default environment variables (JWT_SECRET not set externally)"
  export JWT_SECRET="smartlogi-jwt-secret"
fi

echo "Checking database schema..."
if [ ! -f "/app/packages/prisma-schemas/prisma/dev.db" ]; then
  echo "Database not found, creating..."
  cd /app/packages/prisma-schemas/prisma
  DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma db push --schema=schema.prisma --accept-data-loss --skip-generate
fi
if [ -f "/app/packages/prisma-schemas/prisma/dev.db" ]; then
  echo "Database exists, running seed..."
  DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx ts-node packages/prisma-schemas/prisma/seed.ts
fi

sleep 2

echo "Starting services via Supervisor..."
exec /usr/bin/supervisord -n -c /app/supervisord.conf