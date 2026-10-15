FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/wms-engine/package.json ./packages/wms-engine/
COPY backend/inventory-service/package.json ./backend/inventory-service/

COPY packages/ ./packages/
COPY backend/inventory-service/ ./backend/inventory-service/

RUN pnpm install --no-frozen-lockfile

# Build các dependency nội bộ trước
RUN pnpm --filter shared-types build
RUN pnpm --filter wms-engine build
RUN pnpm --filter prisma-schemas exec prisma generate

RUN pnpm --filter inventory-service build
RUN pnpm deploy --filter inventory-service --prod /prod/app
RUN cp -r /app/packages/prisma-schemas/prisma /prod/app/prisma && \
    cd /prod/app && pnpm exec prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /prod/app ./

EXPOSE 3000
CMD ["node", "dist/main.js"]

