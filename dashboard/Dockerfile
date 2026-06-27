# =============================================================================
# Dockerfile — Consultorio Médico Dashboard
# Multi-stage build optimizado para Dokploy / producción
#
# Build:   docker build -t consultorio-medico-dashboard .
# Run:     docker run -p 3000:3000 consultorio-medico-dashboard
# =============================================================================

# ─── Stage 1: Dependencias ───────────────────────────────────────────────────
FROM node:26-alpine AS deps
WORKDIR /app

# Corepack para pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo los archivos de dependencias para cachear capa
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app

# Cache buster: cambiar este valor para forzar rebuild completo
# Debe declararse en CADA stage donde se necesita invalidar cache
ARG CACHEBUST=5
RUN echo "Cache bust: $CACHEBUST"

# Copiar dependencias desde stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm build

# ─── Fix standalone deps: instalar deps de producción en el standalone ──────
# Next.js standalone output con pnpm genera package.json pero node_modules vacío.
# Usamos npm ci --production --ignore-scripts dentro del standalone para poblarlo.
WORKDIR /app/dashboard/.next/standalone
RUN npm ci --production --ignore-scripts --prefer-offline 2>/dev/null || npm install --production --ignore-scripts
WORKDIR /app

# No necesitamos tar: Docker COPY --from=builder sigue symlinks automáticamente.
# El COPY del standalone más abajo ya trae node_modules/ del output.

# ─── Stage 3: Runner (producción) ────────────────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV TZ=America/Santiago

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# En monorepo pnpm con dashboard como subdirectorio, el standalone output está en
# /app/dashboard/.next/standalone (no en /app/.next/standalone)

# Copiar standalone output de Next.js (server.js, .next, node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# Copiar static assets
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./.next/static

# Copiar assets públicos
COPY --from=builder --chown=nodejs:nodejs /app/dashboard/public ./public

# Crear directorio para cache de Next.js con permisos correctos
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs

EXPOSE 3000

# Health check: usa Node.js fetch nativo (no requiere curl/wget).
# Usa 127.0.0.1 en vez de localhost para evitar problemas de DNS en Docker Swarm.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
