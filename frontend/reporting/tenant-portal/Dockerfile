FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl && npm install -g pnpm@9.0.0 typescript

WORKDIR /app

# Copy configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/prisma-schemas/package.json ./packages/prisma-schemas/
COPY frontend/reporting/tenant-portal/package.json ./frontend/reporting/tenant-portal/

# Copy source code
COPY packages/ ./packages/
COPY frontend/reporting/tenant-portal/ ./frontend/reporting/tenant-portal/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter prisma-schemas exec prisma generate
RUN pnpm --filter tenant-portal build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone mode output
COPY --from=builder /app/frontend/reporting/tenant-portal/public ./frontend/reporting/tenant-portal/public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/reporting/tenant-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/reporting/tenant-portal/.next/static ./frontend/reporting/tenant-portal/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "frontend/reporting/tenant-portal/server.js"]
