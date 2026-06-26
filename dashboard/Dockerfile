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

# No necesitamos tar: Docker COPY --from=builder sigue symlinks automáticamente.
# El COPY del standalone más abajo ya trae node_modules/ del output.

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

# ⚠️ A partir de Next.js 14.2.21+, el standalone output es plano
# (server.js en la raíz, NO dentro de dashboard/)
# Por eso CMD apunta a server.js sin el prefijo dashboard/

# Copiar standalone output de Next.js (plano: server.js, .next, node_modules en raíz)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/standalone ./

# ⚠️ Next.js 14.2.21+ con pnpm genera un standalone/package.json con las deps
# de producción, pero SIN node_modules/ (está vacío). npm install sobre ese
# package.json falla con npm ≥10 por resolución estricta de peer deps
# (next-auth vs next).
#
# En vez de reinstalar, copiamos node_modules desde el builder. Docker COPY
# --from=builder SIGUE symlinks → aplana la estrutura de pnpm a archivos reales.
# Esto nos da exactamente las mismas versiones que se usaron en build, sin riesgos
# de resolución de dependencias.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copiar static assets (junto a server.js, no bajo dashboard/)
COPY --from=builder --chown=nextjs:nodejs /app/dashboard/.next/static ./.next/static

# Copiar assets públicos (en raíz, no bajo dashboard/)
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
