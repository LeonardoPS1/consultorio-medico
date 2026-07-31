# Stack Tecnológico — Detalle por Capa

> **Última actualización:** 31/07/2026 · Monorepo pnpm workspaces 11.18.0 · Next.js 16 · React 19

Esta página resume el *por qué* de cada elección de stack. El detalle de *cómo* está
integrado cada uno vive en [Arquitectura](../existente/arquitectura.md).

## Frontend

- **Next.js 16 (App Router) + React 19** — server components por defecto, rutas API
  co-ubicadas con el frontend, sin necesidad de un backend separado para la mayoría de los
  casos.
- **shadcn/ui + Radix UI + Tailwind CSS** — componentes accesibles por defecto (Radix),
  sin dependencia de un runtime de componentes propietario — el código vive en el repo,
  no en un paquete de node_modules opaco.
- **TanStack Query** — cache y sincronización de estado del servidor en el cliente.
- **FullCalendar 6.x** — vista de agenda/turnos.
- **Recharts** — gráficos de reportes y KPIs.
- **framer-motion** — animaciones y transiciones de página.

## Backend

- **Drizzle ORM 0.31** — type-safety end-to-end con PostgreSQL 16, migraciones versionadas
  en el repo (`dashboard/drizzle/migrations/`, 53 aplicadas).
- **Zod** — única fuente de verdad de validación, reutilizada entre formularios del
  frontend y validación de API routes.
- **NextAuth v5 + bcrypt + 2FA TOTP** — autenticación con sesiones JWT y lockout.

## Automatización e IA

- **n8n (self-hosted)** — orquestación de todos los workflows de negocio (WhatsApp, email,
  recordatorios, recetas). Ver [Workflows n8n](../existente/workflows-n8n.md).
- **Ollama + Gemma3** — inferencia local, sin llamadas a APIs de IA externas — mantiene los
  datos clínicos dentro de la infraestructura propia.

## Mensajería y comunicaciones

- **Twilio** — WhatsApp Business API y SMS (canal principal).
- **Chatwoot + Evolution API** — canal de soporte (feature `soporte`), con webhook
  HMAC-SHA256 y enrutamiento alternativo de mensajería (`CANAL_MENSAJERIA` flag).
- **LiveKit** — videoconsultas de telemedicina self-hosted.

## Pagos

- **MercadoPago SDK** — cobros en CLP, con expansión de moneda planeada para
  Argentina (ARS) y México (MXN). Grace period de 7 días (estado `past_due`).
- **Google Calendar API** — sincronización de turnos (service account).

## Infraestructura

- **Docker Swarm + Traefik** — despliegue self-hosted en VPS propia, sin dependencia de
  proveedores cloud administrados.
- **Dokploy** — capa de gestión de despliegues sobre la VPS (dashboard, docs, ops-console).
- **GitHub Actions → ghcr.io → Dokploy** — pipeline CI/CD obligatorio (sourceType git de
  Dokploy es inestable para Swarm).
- **Metabase** — self-service analytics con dashboards configurables sobre PostgreSQL.
- **PgBouncer** — pooler de conexiones en el stack de producción.
- **Ops Console (AicoreOps)** — segundo workspace (`ops-console`, puerto 3002) para gestión
  de tenants, operadores, sesiones, passkeys, impersonación y recuperación per-tenant.

## Por qué self-hosted en cada capa

La decisión transversal del proyecto es minimizar intermediarios SaaS de terceros:
Ollama en vez de OpenAI/Anthropic API para el agente conversacional, n8n self-hosted en
vez de Zapier/Make, Docker Swarm propio en vez de un PaaS administrado, LiveKit en vez de
Zoom/Twilio Video. El trade-off consciente es más responsabilidad operativa (parchar,
monitorear, escalar manualmente) a cambio de costo variable más bajo y control total de los
datos clínicos.
