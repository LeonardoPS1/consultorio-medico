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

# El standalone output de Next.js preserva la estructura del monorepo
# /app/dashboard/.next/standalone/dashboard/ → server.js, .next, node_modules
# Por eso copiamos a /app/ y server.js queda en /app/dashboard/server.js

# Copiar standalone output de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# Copiar static assets (deben ir junto a server.js bajo dashboard/)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./dashboard/.next/static

# Copiar assets públicos (deben ir junto a server.js bajo dashboard/)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/public ./dashboard/public

# Copiar migraciones SQL para setup inicial en producción
COPY --from=builder --chown=nextjs:nodejs /app/database ./database

# Crear directorio para cache de Next.js con permisos correctos
RUN mkdir -p dashboard/.next/cache && chown -R nextjs:nodejs dashboard/.next

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dashboard/server.js"]
