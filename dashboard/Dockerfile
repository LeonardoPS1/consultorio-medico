# =============================================================================
# Dockerfile — Consultorio Médico Dashboard
# Multi-stage build optimizado para Dokploy / producción
#
# Build:   docker build -t consultorio-medico-dashboard .
# Run:     docker run -p 3000:3000 consultorio-medico-dashboard
# =============================================================================

# ─── Stage 1: Dependencias ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo los archivos de dependencias para cachear capa
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm build

# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar assets públicos (imágenes, SVGs, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar standalone output de Next.js
# Esto incluye server.js + .next + node_modules recortados por trace
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copiar static assets por separado (Next.js no los incluye en standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Crear directorio para cache de Next.js con permisos correctos
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
