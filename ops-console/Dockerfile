# =============================================================================
# Dockerfile — AicoreOps Console
# Multi-stage build, standalone app (uses npm, not pnpm)
# =============================================================================

# ─── Stage 1: Dependencias + Build ───────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --include=dev

COPY . .
RUN npm run build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3002
ENV TZ=America/Santiago

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3002/api/health || exit 1

CMD ["node", "server.js"]
