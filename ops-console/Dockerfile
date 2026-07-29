# =============================================================================
# Dockerfile — AicoreOps Console
# Multi-stage build, standalone app (uses pnpm workspace from root)
# Build context: project root (.)
# =============================================================================

# ─── Stage 1: Dependencias + Build ───────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm install -g pnpm@11.14.0

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY ops-console/package.json ./ops-console/package.json
RUN pnpm install --frozen-lockfile --filter aicore-ops

COPY ops-console/ ./ops-console/
RUN pnpm --filter aicore-ops run build

# ─── Stage 2: Runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3002
ENV TZ=America/Santiago

RUN apk add --no-cache curl docker-cli gpg bash su-exec openssh-client

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/ops-console/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/ops-console/.next/static ./ops-console/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/ops-console/public ./ops-console/public

COPY ops-console/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p ops-console/.next/cache && chown -R nextjs:nodejs ops-console

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3002/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "ops-console/server.js"]
