FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@9.0.0

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY packages/shared-types/package.json ./packages/shared-types/

COPY packages/prisma-schemas/ ./packages/prisma-schemas/
COPY packages/shared-types/src ./packages/shared-types/src

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter prisma-schemas exec prisma generate

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app/packages/prisma-schemas
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

CMD sh -c "pnpm exec prisma db push && pnpm exec prisma db seed && echo 'Database ready'"
