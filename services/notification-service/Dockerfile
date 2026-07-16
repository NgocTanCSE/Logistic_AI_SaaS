FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@9.0.0

WORKDIR /app

# Copy các file cấu hình workspace để tận dụng cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY services/notification-service/package.json ./services/notification-service/

# Copy các package nội bộ cần thiết
COPY packages/ ./packages/
COPY services/notification-service/ ./services/notification-service/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter prisma-schemas exec prisma generate
RUN pnpm --filter notification-service build
RUN pnpm deploy --filter notification-service --prod /prod/app
RUN cp -r /app/packages/prisma-schemas/prisma /prod/app/prisma && \
    cd /prod/app && npx --yes prisma@5.18.0 generate && \
    npx --yes prisma@5.18.0 db push --skip-generate --accept-data-loss

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /prod/app ./

EXPOSE 8086
CMD ["node", "dist/main.js"]
