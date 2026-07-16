FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY services/api-gateway/package.json ./services/api-gateway/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

RUN corepack enable && pnpm install --no-frozen-lockfile

COPY packages/shared-types ./packages/shared-types
COPY services/api-gateway ./services/api-gateway

RUN cd services/api-gateway && pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/packages/prisma-schemas/node_modules ./node_modules
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main.js"]
