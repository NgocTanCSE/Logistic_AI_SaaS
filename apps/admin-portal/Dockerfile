FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@9.0.0 typescript

WORKDIR /app

# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY apps/admin-portal/package.json ./apps/admin-portal/

# Copy source code
COPY packages/ ./packages/
COPY apps/admin-portal/ ./apps/admin-portal/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter prisma-schemas exec prisma generate
RUN pnpm --filter admin-portal build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone mode output
COPY --from=builder /app/apps/admin-portal/public ./apps/admin-portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-portal/.next/static ./apps/admin-portal/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin-portal/server.js"]
