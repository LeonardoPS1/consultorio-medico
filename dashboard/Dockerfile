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

# Cache buster: cambiar este valor para forzar rebuild completo
ARG CACHEBUST=2

# Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo los archivos de dependencias para cachear capa
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm build

# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar standalone output de Next.js (estructura plana: server.js en raiz)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# Copiar static assets al directorio esperado por el servidor (.next/static)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./.next/static

# Copiar assets públicos al directorio raiz (donde el servidor los espera)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/public ./public

# Crear directorio para cache de Next.js
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# Health check rápido: solo verifica que el server Node.js responda
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
