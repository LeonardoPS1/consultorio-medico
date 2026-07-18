# Stack Tecnológico — Detalle por Capa

Esta página resume el *por qué* de cada elección de stack. El detalle de *cómo* está
integrado cada uno vive en [Arquitectura](../existente/arquitectura.md).

## Frontend

- **Next.js (App Router)** — server components por defecto, rutas API co-ubicadas con el
  frontend, sin necesidad de un backend separado para la mayoría de los casos.
- **shadcn/ui + Radix UI + Tailwind CSS** — componentes accesibles por defecto (Radix),
  sin dependencia de un runtime de componentes propietario — el código vive en el repo,
  no en un paquete de node_modules opaco.
- **TanStack Query** — cache y sincronización de estado del servidor en el cliente.
- **FullCalendar** — vista de agenda/turnos.
- **Recharts** — gráficos de reportes y KPIs.

## Backend

- **Drizzle ORM** — type-safety end-to-end con PostgreSQL, migraciones versionadas en el repo.
- **Zod** — única fuente de verdad de validación, reutilizada entre formularios del
  frontend y validación de API routes.
- **NextAuth v5 + bcrypt** — autenticación con sesiones JWT.

## Automatización e IA

- **n8n (self-hosted)** — orquestación de todos los workflows de negocio (WhatsApp, email,
  recordatorios, recetas). Ver [Workflows n8n](../existente/workflows-n8n.md).
- **Ollama + Gemma3** — inferencia local, sin llamadas a APIs de IA externas — mantiene los
  datos clínicos dentro de la infraestructura propia.

## Mensajería y comunicaciones

- **Twilio** — WhatsApp Business API y SMS.
- **LiveKit** — videoconsultas de telemedicina.

## Pagos

- **MercadoPago SDK** — cobros en CLP, con expansión de moneda planeada para
  Argentina (ARS) y México (MXN).

## Infraestructura

- **Docker Swarm + Traefik** — despliegue self-hosted en VPS propia, sin dependencia de
  proveedores cloud administrados.
- **Dokploy** — capa de gestión de despliegues sobre la VPS.

## Por qué self-hosted en cada capa

La decisión transversal del proyecto es minimizar intermediarios SaaS de terceros:
Ollama en vez de OpenAI/Anthropic API para el agente conversacional, n8n self-hosted en
vez de Zapier/Make, Docker Swarm propio en vez de un PaaS administrado. El trade-off
consciente es más responsabilidad operativa (parchar, monitorear, escalar manualmente) a
cambio de costo variable más bajo y control total de los datos clínicos.
