# =============================================================================
# Dockerfile — Consultorio Médico Dashboard
# Multi-stage build optimizado para Dokploy / producción
#
# Build:   docker build -t consultorio-medico-dashboard .
# Run:     docker run -p 3000:3000 consultorio-medico-dashboard
# =============================================================================

# ─── Stage 1: Dependencias ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Cache buster
ARG CACHEBUST=10
RUN echo "Cache bust: $CACHEBUST"

# Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Cache pnpm store entre builds (Docker BuildKit)
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.npm \
    mkdir -p /root/.local/share/pnpm/store

# Copiar solo los archivos de dependencias para cachear capa
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY dashboard/package.json ./dashboard/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.npm \
    pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Cache buster: cambiar este valor para forzar rebuild completo
# Debe declararse en CADA stage donde se necesita invalidar cache
ARG CACHEBUST=10
ARG GIT_COMMIT=unknown
ARG BUILD_TIME=unknown
RUN echo "Cache bust: $CACHEBUST"

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dashboard/node_modules ./dashboard/node_modules
COPY . .

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_GIT_COMMIT=$GIT_COMMIT
ENV NEXT_PUBLIC_BUILD_TIME=$BUILD_TIME

# Cache .next/cache y pnpm store entre builds
RUN --mount=type=cache,target=/app/dashboard/.next/cache \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    corepack enable && corepack prepare pnpm@9 --activate && pnpm build

# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV TZ=America/Santiago

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar standalone output (server.js, .next, node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# Copiar static assets
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./.next/static

# Copiar assets públicos
COPY --from=builder --chown=nodejs:nodejs /app/dashboard/public ./public

# Crear directorio para cache de Next.js con permisos correctos
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# Health check: usa curl (más compatible con Docker Swarm).
# Usa 127.0.0.1 en vez de localhost para evitar problemas de DNS.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
