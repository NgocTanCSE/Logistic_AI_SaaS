FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY api/api-gateway/package.json ./api/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY packages/shared-types ./packages/shared-types
COPY api/api-gateway ./api/api-gateway

RUN cd api/api-gateway && pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/packages/prisma-schemas/node_modules ./node_modules
COPY --from=builder /app/api/api-gateway/dist ./dist
COPY --from=builder /app/api/api-gateway/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
