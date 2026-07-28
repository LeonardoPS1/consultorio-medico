# =============================================================================
# Dockerfile — Consultorio Médico Dashboard
# Multi-stage build optimizado para Dokploy / producción
#
# Build:   docker build -t consultorio-medico-dashboard dashboard/
# Run:     docker run -p 3000:3000 consultorio-medico-dashboard
# =============================================================================

# ─── Stage 1: Dependencias ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

ARG CACHEBUST=16
RUN echo "Cache bust: $CACHEBUST"

RUN corepack enable && corepack prepare pnpm@11.14.0 --activate

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.npm \
    mkdir -p /root/.local/share/pnpm/store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY dashboard/package.json ./dashboard/

# Ensure all workspace members exist for pnpm resolution
RUN mkdir -p /app/ops-console && echo '{"name":"ops-console","version":"0.0.0","private":true}' > /app/ops-console/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.npm \
    pnpm install --no-frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG CACHEBUST=15
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
RUN echo "Cache bust: $CACHEBUST"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dashboard/node_modules ./dashboard/node_modules

# Full repo copy for Next.js standalone tracing
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
ENV NEXT_PUBLIC_BUILD_TIME=$BUILD_TIME

RUN corepack enable && corepack prepare pnpm@11.14.0 --activate && pnpm build

# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV TZ=America/Santiago

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (preserves pnpm workspace path)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./dashboard/.next/static

# Copy public assets
COPY --from=builder --chown=nodejs:nodejs /app/dashboard/public ./dashboard/public

RUN mkdir -p dashboard/.next/cache && chown -R nextjs:nodejs dashboard

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "dashboard/server.js"]
