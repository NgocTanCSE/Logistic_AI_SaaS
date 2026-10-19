FROM node:22-bookworm

# Build cache bust: 2026-10-19 fix-bullseye-404-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y postgresql-client supervisor dos2unix python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy monorepo config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./

# Copy necessary structures for dependency installation
COPY frontend/feature-test/admin-portal/package.json ./frontend/feature-test/admin-portal/
COPY frontend/reporting/tenant-portal/package.json ./frontend/reporting/tenant-portal/
COPY frontend/reporting/customer-portal/package.json ./frontend/reporting/customer-portal/
COPY frontend/reporting/pack-station-web/package.json ./frontend/reporting/pack-station-web/
COPY backend/iam-service/package.json ./backend/iam-service/
COPY backend/customer-api/package.json ./backend/customer-api/
COPY backend/notification-service/package.json ./backend/notification-service/
COPY api/api-gateway/package.json ./api/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY packages/map-components/package.json ./packages/map-components/
COPY packages/hardware-bridge/package.json ./packages/hardware-bridge/
COPY packages/ui-components/package.json ./packages/ui-components/
COPY packages/wms-engine/package.json ./packages/wms-engine/
COPY packages/offline-sync-engine/package.json ./packages/offline-sync-engine/
COPY packages/mobile-ui-kit/package.json ./packages/mobile-ui-kit/
COPY backend/inventory-service/package.json ./backend/inventory-service/
COPY backend/logistics-service/package.json ./backend/logistics-service/
COPY backend/order-service/package.json ./backend/order-service/
# Install dependencies (development mode to build everything)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY frontend ./frontend
COPY backend ./backend
COPY api ./api
COPY packages ./packages
COPY scripts/convert_schema.py ./convert_schema.py
COPY supervisord.conf /app/supervisord.conf
COPY start.sh /app/start.sh

# 1. Build Shared Types
RUN pnpm --filter shared-types build

# 2. Generate Prisma Client (convert schema first)
ENV NEXT_PUBLIC_API_URL=/api/v1
RUN python3 convert_schema.py
ENV DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db"
RUN cd packages/prisma-schemas && npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate
# Copy schema and generate prisma client in each service
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/iam-service/prisma
RUN cd /app/backend/iam-service && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/inventory-service/prisma
RUN cd /app/backend/inventory-service && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/order-service/prisma
RUN cd /app/backend/order-service && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/logistics-service/prisma
RUN cd /app/backend/logistics-service && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/customer-api/prisma
RUN cd /app/backend/customer-api && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate
RUN cp -r /app/packages/prisma-schemas/prisma /app/backend/notification-service/prisma
RUN cd /app/backend/notification-service && DATABASE_URL="file:/app/packages/prisma-schemas/prisma/dev.db" npx prisma generate

# 3. Install Python AI Service dependencies
RUN pip3 install -r backend/ai-service/requirements.txt

# 4. Build Backend Services
ENV NEXT_PUBLIC_API_URL=/api/v1
RUN pnpm --filter iam-service run build
RUN pnpm --filter customer-api run build
RUN pnpm --filter notification-service run build
RUN pnpm --filter api-gateway run build
RUN pnpm --filter wms-engine run build
RUN pnpm --filter inventory-service run build
RUN pnpm --filter logistics-service run build
RUN pnpm --filter order-service run build

# 5. Build Frontend Apps
RUN pnpm --filter tenant-portal run build
RUN pnpm --filter admin-portal run build
RUN pnpm --filter customer-portal run build

# Final adjustments
RUN dos2unix /app/start.sh && chmod +x /app/start.sh
RUN chmod -R 777 /app

ENV PORT=3007
EXPOSE $PORT
CMD ["/app/start.sh"]
