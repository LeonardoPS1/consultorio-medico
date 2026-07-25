# =============================================================================
# Dockerfile — AicoreOps Console
# Multi-stage build, mismo patrón que el dashboard principal
# =============================================================================

# ─── Stage 1: Dependencias ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

RUN corepack enable && corepack prepare pnpm@11.14.0 --activate

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    mkdir -p /root/.local/share/pnpm/store

COPY package.json ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-workspace

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG CACHEBUST=1
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
RUN echo "Cache bust: $CACHEBUST"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.14.0 --activate && \
    pnpm build

# ─── Stage 3: Runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3001
ENV TZ=America/Santiago

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server.js"]
