FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@9.0.0

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/customer-api/package.json ./services/customer-api/

COPY packages/ ./packages/
COPY services/customer-api/ ./services/customer-api/

RUN pnpm install --no-frozen-lockfile

# Build các dependency nội bộ trước
RUN pnpm --filter shared-types build
RUN pnpm --filter prisma-schemas exec prisma generate

RUN pnpm --filter customer-api build
RUN pnpm deploy --filter customer-api --prod /prod/app
RUN cp -r /app/packages/prisma-schemas/prisma /prod/app/prisma && \
    cd /prod/app && npx --yes prisma@5.18.0 generate && \
    npx --yes prisma@5.18.0 db push --skip-generate --accept-data-loss

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /prod/app ./

EXPOSE 3000
CMD ["node", "dist/services/customer-api/src/main.js"]

